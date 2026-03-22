import base64
import io
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, cast

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from openai import OpenAI
from PIL import Image

load_dotenv(Path(__file__).parent.parent / ".env")

API_KEY = os.environ["OPENROUTER_API_KEY"]

SYSTEM_PROMPT = """You are a social media content creation engine.

When given a user prompt and/or image, you must:
1. Generate a visually striking, high-quality social media post image that matches the theme and content described. The image should look polished, professional, and optimized for social media (square or portrait format, bold visuals, clean composition).
2. After the image, write an engaging social media caption. The caption must:
   - Hook the reader in the first line
   - Clearly communicate the value or message
   - Include relevant hashtags (5–10)
   - End with a call to action
   - Be formatted for easy reading (use line breaks)

Return the image first, then the caption text below it."""

EDIT_PROMPT_TEMPLATE = """You are an image editor. I will give you two versions of the same image:

1. The ORIGINAL image — the clean version to use as reference.
2. The ANNOTATED image — the same image with a bright red rectangle drawn on it marking the edit zone.

Your task: output a NEW version of the full image where the area inside the red rectangle has been changed to show "{prompt}". Everything outside the red rectangle must remain pixel-for-pixel identical to the original.

Rules:
- Reproduce the full image at the same dimensions
- Only change what is inside the red rectangle
- The new content must match the art style, lighting, color palette, shadows, and depth of the surrounding image so it looks like it was always there
- No hard edges or visible seams at the rectangle boundary — blend naturally
- Do not draw the red rectangle in the output"""

GUI_DIR = Path(__file__).parent.parent / "GUI"

app = Flask(__name__, static_folder=".")
CORS(app)

OUTPUT_DIR = Path("generated_images")
OUTPUT_DIR.mkdir(exist_ok=True)


def decode_base64_image(data_url: str) -> tuple[bytes, str]:
    match = re.match(r"^data:(image/[a-zA-Z0-9.+-]+);base64,(.+)$", data_url)
    if not match:
        raise ValueError("Invalid image data URL format")
    mime_type, b64_data = match.groups()
    return base64.b64decode(b64_data), mime_type


def save_image_bytes(image_bytes: bytes, mime_type: str, prefix: str = "post") -> tuple[Path, str]:
    ext_map = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif"}
    file_ext = ext_map.get(mime_type, "png")
    filename = f"{prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.{file_ext}"
    file_path = OUTPUT_DIR / filename
    file_path.write_bytes(image_bytes)
    return file_path, filename


def pil_to_data_url(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/png;base64,{b64}"


def to_image_data_url(file_bytes: bytes, mime_type: str) -> str:
    encoded = base64.b64encode(file_bytes).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"


def build_user_message(text: str | None, image_data_url: str | None) -> dict[str, Any]:
    parts: list[dict[str, Any]] = []
    if text:
        parts.append({"type": "text", "text": text})
    if image_data_url:
        parts.append({"type": "image_url", "image_url": {"url": image_data_url}})
    if len(parts) == 1 and parts[0].get("type") == "text":
        return {"role": "user", "content": parts[0]["text"]}
    return {"role": "user", "content": parts}


def call_gemini(messages: list) -> Any:
    client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=API_KEY)
    return client.chat.completions.create(
        model="google/gemini-3.1-flash-image-preview",
        messages=messages,
        extra_body={"modalities": ["image", "text"]},
    )


@app.route("/")
def index():
    return send_from_directory(str(GUI_DIR), "index2.html")

@app.route("/<path:filename>")
def gui_static(filename):
    return send_from_directory(str(GUI_DIR), filename)


@app.route("/generate", methods=["POST"])
def generate():
    prompt = request.form.get("prompt", "").strip() or None
    image_file = request.files.get("image")

    if not prompt and not image_file:
        return jsonify({"error": "Please provide a prompt, an image, or both."}), 400

    image_data_url = None
    if image_file and image_file.filename:
        mime_type = image_file.content_type or "image/png"
        image_data_url = to_image_data_url(image_file.read(), mime_type)

    user_message = cast(Any, build_user_message(prompt, image_data_url))

    try:
        response = call_gemini([
            {"role": "system", "content": SYSTEM_PROMPT},
            user_message,
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    message = response.choices[0].message
    images = getattr(message, "images", None)

    if not images:
        return jsonify({"error": "Gemini did not return an image."}), 500

    image_data_url = images[0]["image_url"]["url"]
    image_bytes, mime_type = decode_base64_image(image_data_url)
    _, filename = save_image_bytes(image_bytes, mime_type, prefix="post")

    return jsonify({
        "image": image_data_url,
        "filename": filename,
        "caption": message.content or "",
    })


@app.route("/edit", methods=["POST"])
def edit():
    data = request.get_json()
    filename = data.get("filename", "")
    x = int(data.get("x", 0))
    y = int(data.get("y", 0))
    w = int(data.get("w", 0))
    h = int(data.get("h", 0))
    prompt = data.get("prompt", "").strip()

    if not filename or not prompt:
        return jsonify({"error": "filename and prompt are required."}), 400
    if w < 10 or h < 10:
        return jsonify({"error": "Selection is too small. Draw a larger area."}), 400

    original_path = OUTPUT_DIR / filename
    if not original_path.exists():
        return jsonify({"error": "Original image not found on server."}), 404

    # Load original
    original = Image.open(original_path).convert("RGB")
    img_w, img_h = original.size

    # Clamp coordinates to image bounds
    x = max(0, min(x, img_w - 1))
    y = max(0, min(y, img_h - 1))
    w = max(10, min(w, img_w - x))
    h = max(10, min(h, img_h - y))

    # Build annotated image: draw a bold red rectangle on a copy to mark the edit zone
    from PIL import ImageDraw
    annotated = original.copy()
    draw = ImageDraw.Draw(annotated)
    border = 4
    for i in range(border):
        draw.rectangle([x + i, y + i, x + w - i, y + h - i], outline=(255, 0, 0))

    original_data_url  = pil_to_data_url(original)
    annotated_data_url = pil_to_data_url(annotated)

    # Send original + annotated — Gemini regenerates the full image with the change inside the box
    edit_prompt = EDIT_PROMPT_TEMPLATE.format(prompt=prompt)
    user_message = cast(Any, {
        "role": "user",
        "content": [
            {"type": "text",      "text": edit_prompt},
            {"type": "text",      "text": "IMAGE 1 — Original (clean reference):"},
            {"type": "image_url", "image_url": {"url": original_data_url}},
            {"type": "text",      "text": "IMAGE 2 — Annotated (red rectangle shows the edit zone):"},
            {"type": "image_url", "image_url": {"url": annotated_data_url}},
        ],
    })

    try:
        response = call_gemini([user_message])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    message = response.choices[0].message
    images = getattr(message, "images", None)

    if not images:
        return jsonify({"error": "Gemini did not return an edited image."}), 500

    # Gemini returns the full edited image — no compositing needed
    result_bytes, _ = decode_base64_image(images[0]["image_url"]["url"])
    result = Image.open(io.BytesIO(result_bytes)).convert("RGB")

    # Save and return
    result_filename = f"edit_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.png"
    result_path = OUTPUT_DIR / result_filename
    result.save(result_path, format="PNG")

    return jsonify({
        "image": pil_to_data_url(result),
        "filename": result_filename,
    })


if __name__ == "__main__":
    print("Server running at http://localhost:5000")
    app.run(debug=True, port=5000, use_reloader=False)
