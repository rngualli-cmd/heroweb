document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const body            = document.body;
    const sidebar         = document.getElementById('sidebar');
    const menuToggle      = document.getElementById('menu-toggle');
    const settingsModal   = document.getElementById('settings-modal');
    const settingsBtn     = document.getElementById('settings-btn');
    const closeModal      = document.getElementById('close-modal');
    const promptInput     = document.getElementById('prompt-input');
    const submitBtn       = document.getElementById('submit-btn');
    const historyList     = document.getElementById('history-list');
    const heroTitle       = document.getElementById('hero-title');
    const heroArea        = document.getElementById('hero-area');
    const resultDisplay   = document.getElementById('result-display');
    const spiderContainer = document.getElementById('spiderman-hanging');
    const newSessionBtn   = document.getElementById('new-session-btn');
    const fileUpload      = document.getElementById('file-upload');
    const addBtn          = document.getElementById('add-btn');
    const previewGallery  = document.getElementById('preview-gallery');
    const inputContainer  = document.querySelector('.input-container');
    const captionBox      = document.getElementById('caption-box');
    const captionText     = document.getElementById('caption-text');
    const editSection     = document.getElementById('edit-section');
    const editBtn         = document.getElementById('edit-btn');
    const editPromptInput = document.getElementById('edit-prompt');
    const editLoader      = document.getElementById('edit-loader');
    const editError       = document.getElementById('edit-error');
    const selectionInfo   = document.getElementById('selection-info');
    const undoBtn         = document.getElementById('undo-btn');
    const canvasHint      = document.getElementById('canvas-hint');
    const canvas          = document.getElementById('edit-canvas');
    const ctx             = canvas ? canvas.getContext('2d') : null;
    const variantsPicker  = document.getElementById('variants-picker');
    const variantsGrid    = document.getElementById('variants-grid');
    const useVariantBtn   = document.getElementById('use-variant-btn');
    const variantsCheck   = document.getElementById('variants-check');

    const SERVER = 'http://localhost:5000';

    // ── Character Database ─────────────────────────────────────────────────
    const CHARACTERS = [
        {
            name: "Ancient Boy", type: "Hero", traits: ["Human", "Living"],
            stats: { Age: 38.03, Height: "10'11\"", Weight_kg: 34.3, PWR: 19, INT: 77 },
            personality: "Protective", hometown: "Hong Kong", weakness: "Magic vulnerable"
        },
        {
            name: "Ancient Centurion", type: "Villain", traits: ["Human"],
            stats: { Age: 37.24, Height: "4'9\"", Weight_kg: 157.8, PWR: 85, DEF: 73 },
            personality: "Reckless", hometown: "Luanda", weakness: "Poison susceptible"
        },
        {
            name: "Ancient Ghost", type: "Hero", traits: ["Employed"],
            stats: { Age: 8846.86, Height: "0'1\"", Weight_kg: 145.1, PWR: 80, SPD: 22, EVIL: 97 },
            personality: "Sadistic", hometown: "Bangalore", weakness: "Light sensitive"
        },
        {
            name: "Ancient Doom", type: "Villain", traits: [],
            stats: { Age: 41.26, Height: "20'8\"", Weight_kg: 119.2, PWR: 10, SPD: 100, EVIL: 82 },
            personality: "Loyal", hometown: "Houston", weakness: "Electric weakness"
        }
    ];

    // --- State ---
    let currentFilename   = null;
    let currentDataUrl    = null;
    let canvasImg         = new Image();
    let currentMode       = 'edit';   // 'edit' | 'addtext'
    let selectedVariant   = null;

    // Edit history stack
    let editHistory  = [];   // [{ dataUrl, filename, caption }, ...]
    let historyIndex = -1;   // current position

    // Last generation inputs (for Regenerate)
    let lastPrompt    = null;
    let lastImageBlob = null;

    // Canvas drawing state
    let isDrawing = false;
    let startX = 0, startY = 0;
    let selX = 0, selY = 0, selW = 0, selH = 0;
    let hasSelection = false;

    // Add Text state
    const atState = { style: 'bold', size: 'medium', color: 'white', effect: 'shadow' };

    // Last character selected from Library (for Card mode pre-fill)
    let currentCharacter = null;

    // ── Theme ──────────────────────────────────────────────────────────────
    const applyTheme = (theme) => {
        const isDark = theme === 'dark';
        body.classList.remove('dark-mode', 'light-mode');
        body.classList.add(isDark ? 'dark-mode' : 'light-mode');

        if (heroArea) heroArea.style.display = 'flex';
        if (heroTitle) {
            heroTitle.classList.remove('text-fade-exit');
            heroTitle.innerHTML = isDark
                ? `<span>Unleash</span><span>The Villain</span><span>In You</span>`
                : `<span>Unleash</span><span>The Hero</span><span>In You</span>`;
        }
        if (spiderContainer) {
            spiderContainer.classList.remove('dropping', 'spider-exit');
            spiderContainer.style.display = 'none';
            void spiderContainer.offsetWidth;
            spiderContainer.style.display = 'block';
            spiderContainer.classList.add('dropping');
        }
        document.querySelectorAll('.theme-toggle').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
        localStorage.setItem('selected-theme', theme);
    };

    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
    });

    // Text size
    document.getElementById('text-size-select')?.addEventListener('change', function () {
        body.classList.remove('text-small', 'text-normal', 'text-large');
        body.classList.add(`text-${this.value}`);
    });

    // ── History ────────────────────────────────────────────────────────────
    const saveHistoryToStorage = () => {
        const items = [];
        historyList.querySelectorAll('li').forEach(li => {
            if (li.apiData) items.push(li.apiData);
        });
        localStorage.setItem('app-history', JSON.stringify(items));
    };

    const createHistoryElement = (apiResult, isNew = true) => {
        const placeholder = historyList.querySelector('.history-placeholder');
        if (placeholder) placeholder.remove();

        const li = document.createElement('li');
        li.apiData = apiResult;
        const label = apiResult.caption
            ? apiResult.caption.replace(/\n/g, ' ').substring(0, 44) + '…'
            : 'Generated Image';
        li.innerHTML = `<span>${label}</span><button class="delete-history-btn">&times;</button>`;

        li.onclick = (e) => {
            if (!e.target.classList.contains('delete-history-btn')) {
                showResult(apiResult.image, apiResult.filename, apiResult.caption);
                sidebar.classList.remove('open');
            }
        };
        li.querySelector('.delete-history-btn').onclick = (e) => {
            e.stopPropagation(); li.remove(); saveHistoryToStorage();
        };
        isNew ? historyList.prepend(li) : historyList.appendChild(li);
        if (isNew) saveHistoryToStorage();
    };

    const loadSavedHistory = () => {
        try {
            const saved = JSON.parse(localStorage.getItem('app-history')) || [];
            historyList.innerHTML = '';
            saved.forEach(item => createHistoryElement(item, false));
            if (!saved.length) historyList.innerHTML = '<li class="history-placeholder"><em>No prompts yet…</em></li>';
        } catch (err) { console.error(err); }
    };

    // ── Canvas helpers ─────────────────────────────────────────────────────
    function canvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width  / rect.width;
        const scaleY = canvas.height / rect.height;
        const src = e.touches ? e.touches[0] : e;
        return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
    }

    function redrawCanvas() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(canvasImg, 0, 0);
        if (!hasSelection) return;

        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(canvasImg, selX, selY, selW, selH, selX, selY, selW, selH);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(selX, selY, selW, selH);
        ctx.setLineDash([]);

        const hs = 8;
        ctx.fillStyle = '#ffffff';
        [[selX, selY],[selX+selW, selY],[selX, selY+selH],[selX+selW, selY+selH]].forEach(([cx,cy]) => {
            ctx.fillRect(cx - hs/2, cy - hs/2, hs, hs);
        });
    }

    function loadImageToCanvas(dataUrl) {
        canvasImg = new Image();
        canvasImg.onload = () => {
            canvas.width  = canvasImg.naturalWidth;
            canvas.height = canvasImg.naturalHeight;
            clearSelection();
            redrawCanvas();
        };
        canvasImg.src = dataUrl;
    }

    function clearSelection() {
        hasSelection = false; selX = selY = selW = selH = 0;
        if (selectionInfo) selectionInfo.style.display = 'none';
        if (editBtn)       editBtn.disabled = true;
        const atApply = document.getElementById('at-apply-btn');
        if (atApply) atApply.disabled = true;
        updateAtPreview();
        redrawCanvas();
    }

    function updateSelectionInfo() {
        if (selectionInfo) {
            selectionInfo.style.display = 'block';
            selectionInfo.textContent = `Selection: ${Math.round(selW)} × ${Math.round(selH)} px  at  (${Math.round(selX)}, ${Math.round(selY)})`;
        }
        if (currentMode === 'edit' && editBtn) {
            editBtn.disabled = !hasSelection || !editPromptInput?.value.trim();
        }
        if (currentMode === 'addtext') {
            const atApply = document.getElementById('at-apply-btn');
            if (atApply) atApply.disabled = !hasSelection || !document.getElementById('at-text')?.value.trim();
        }
    }

    if (canvas) {
        const down = (e) => {
            e.preventDefault();
            const { x, y } = canvasCoords(e);
            isDrawing = true; startX = x; startY = y; hasSelection = false;
        };
        const move = (e) => {
            if (!isDrawing) return; e.preventDefault();
            const { x, y } = canvasCoords(e);
            selX = Math.min(x, startX); selY = Math.min(y, startY);
            selW = Math.abs(x - startX); selH = Math.abs(y - startY);
            hasSelection = selW > 4 && selH > 4;
            redrawCanvas();
        };
        const up = () => {
            if (!isDrawing) return; isDrawing = false;
            hasSelection ? updateSelectionInfo() : clearSelection();
        };
        canvas.addEventListener('mousedown',  down);
        canvas.addEventListener('mousemove',  move);
        canvas.addEventListener('mouseup',    up);
        canvas.addEventListener('touchstart', down, { passive: false });
        canvas.addEventListener('touchmove',  move, { passive: false });
        canvas.addEventListener('touchend',   up);
    }

    editPromptInput?.addEventListener('input', () => {
        if (editBtn) editBtn.disabled = !hasSelection || !editPromptInput.value.trim();
    });

    document.getElementById('clear-selection-btn')?.addEventListener('click', clearSelection);

    // ── Mode Toggle ────────────────────────────────────────────────────────
    const setMode = (mode) => {
        currentMode = mode;
        const editControls = document.getElementById('edit-controls');
        const addtextPanel = document.getElementById('addtext-panel');
        const cardPanel    = document.getElementById('card-panel');
        const modeEditBtn  = document.getElementById('mode-edit-btn');
        const modeTextBtn  = document.getElementById('mode-text-btn');
        const modeCardBtn  = document.getElementById('mode-card-btn');

        // Reset all panels + buttons
        [modeEditBtn, modeTextBtn, modeCardBtn].forEach(b => b?.classList.remove('active'));
        if (editControls) editControls.style.display = 'none';
        if (addtextPanel) addtextPanel.style.display = 'none';
        if (cardPanel)    cardPanel.style.display    = 'none';
        if (canvas)       canvas.style.cursor        = 'default';

        if (mode === 'edit') {
            modeEditBtn?.classList.add('active');
            if (editControls) editControls.style.display = 'block';
            if (canvas)       canvas.style.cursor        = 'crosshair';
            if (canvasHint)   canvasHint.textContent     = 'Draw a rectangle on the image to select the area you want to change';
        } else if (mode === 'addtext') {
            modeTextBtn?.classList.add('active');
            if (addtextPanel) addtextPanel.style.display = 'block';
            if (canvas)       canvas.style.cursor        = 'crosshair';
            if (canvasHint)   canvasHint.textContent     = 'Draw a rectangle on the image where you want to add text';
        } else if (mode === 'card') {
            modeCardBtn?.classList.add('active');
            if (cardPanel)  cardPanel.style.display  = 'block';
            if (canvasHint) canvasHint.textContent   = 'Preview — click "Render Card" to apply the stats overlay';
            // Pre-fill form if a character is loaded
            if (currentCharacter) prefillCardForm(currentCharacter);
            // Reset canvas to clean image
            redrawCanvas();
        }
        clearSelection();
    };

    document.getElementById('mode-edit-btn')?.addEventListener('click', () => setMode('edit'));
    document.getElementById('mode-text-btn')?.addEventListener('click', () => setMode('addtext'));
    document.getElementById('mode-card-btn')?.addEventListener('click', () => setMode('card'));

    // ── Add Text Logic ─────────────────────────────────────────────────────
    document.querySelectorAll('.at-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.key;
            const val = btn.dataset.val;
            // Deactivate siblings with same key
            document.querySelectorAll(`.at-opt[data-key="${key}"]`).forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            atState[key] = val;
            updateAtPreview();
            // Enable apply if selection + text
            const atApply = document.getElementById('at-apply-btn');
            if (atApply) atApply.disabled = !hasSelection || !document.getElementById('at-text')?.value.trim();
        });
    });

    document.getElementById('at-text')?.addEventListener('input', function () {
        updateAtPreview();
        const atApply = document.getElementById('at-apply-btn');
        if (atApply) atApply.disabled = !hasSelection || !this.value.trim();
    });

    function buildTextPrompt() {
        const text = document.getElementById('at-text')?.value.trim();
        if (!text) return '';
        const effectStr = atState.effect === 'none' ? '' : `, with a ${atState.effect}`;
        return `Add the text "${text}" in ${atState.style} ${atState.color} ${atState.size === 'small' ? 'small' : atState.size === 'large' ? 'large' : 'medium-sized'} font${effectStr}, seamlessly integrated into the image art style — no visible seams or hard edges`;
    }

    function updateAtPreview() {
        const preview = document.getElementById('at-preview');
        if (!preview) return;
        const text = document.getElementById('at-text')?.value.trim();
        if (!text) {
            preview.textContent = 'Fill in the options above to preview the prompt.';
            return;
        }
        if (!hasSelection) {
            preview.textContent = 'Draw a selection on the image first, then the prompt will appear here.';
            return;
        }
        preview.textContent = `Prompt: "${buildTextPrompt()}"`;
    }

    // Apply Text button
    document.getElementById('at-apply-btn')?.addEventListener('click', async () => {
        const prompt = buildTextPrompt();
        if (!prompt || !hasSelection) return;
        await applyEdit(prompt);
    });

    // ── Apply Edit (shared by Edit mode and Add Text mode) ─────────────────
    async function applyEdit(prompt) {
        previousState = { dataUrl: currentDataUrl, filename: currentFilename, caption: captionText?.textContent };
        if (undoBtn) undoBtn.style.display = 'inline-block';

        const activeApplyBtn = currentMode === 'edit' ? editBtn : document.getElementById('at-apply-btn');
        if (activeApplyBtn) { activeApplyBtn.disabled = true; activeApplyBtn.textContent = 'Applying…'; }
        if (editLoader) editLoader.style.display = 'flex';
        if (editError)  editError.style.display  = 'none';

        try {
            const res  = await fetch(`${SERVER}/edit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: currentFilename,
                    x: Math.round(selX), y: Math.round(selY),
                    w: Math.round(selW), h: Math.round(selH),
                    prompt,
                }),
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                if (editError) { editError.textContent = data.error || 'Edit failed.'; editError.style.display = 'block'; }
                return;
            }
            currentDataUrl  = data.image;
            currentFilename = data.filename;
            // Push to history (discards any forward states if we branched)
            pushToHistory(data.image, data.filename, captionText?.textContent || '');
            loadImageToCanvas(data.image);
            if (editPromptInput) editPromptInput.value = '';
            const atTextInput = document.getElementById('at-text');
            if (atTextInput) atTextInput.value = '';
            clearSelection();
        } catch {
            if (editError) { editError.textContent = 'Could not reach the server.'; editError.style.display = 'block'; }
        } finally {
            if (activeApplyBtn) { activeApplyBtn.textContent = activeApplyBtn.id === 'at-apply-btn' ? 'Apply Text' : 'Apply'; activeApplyBtn.disabled = true; }
            if (editLoader) editLoader.style.display = 'none';
        }
    }

    editBtn?.addEventListener('click', () => {
        const prompt = editPromptInput?.value.trim();
        if (!prompt || !hasSelection) return;
        applyEdit(prompt);
    });

    // ── Version History ────────────────────────────────────────────────────
    function pushToHistory(dataUrl, filename, caption) {
        // Discard any future states when a new edit branches off
        editHistory = editHistory.slice(0, historyIndex + 1);
        editHistory.push({ dataUrl, filename, caption: caption || '' });
        historyIndex = editHistory.length - 1;
        updateHistoryUI();
    }

    function navigateHistory(index) {
        if (index < 0 || index >= editHistory.length) return;
        historyIndex = index;
        const state = editHistory[historyIndex];
        currentDataUrl  = state.dataUrl;
        currentFilename = state.filename;
        if (captionText && state.caption) captionText.textContent = state.caption;
        loadImageToCanvas(state.dataUrl);
        clearSelection();
        updateHistoryUI();
    }

    function updateHistoryUI() {
        const undoB   = document.getElementById('undo-btn');
        const redoB   = document.getElementById('redo-btn');
        const strip   = document.getElementById('version-strip');
        const histWrap = document.getElementById('version-history');

        if (undoB) undoB.disabled = historyIndex <= 0;
        if (redoB) redoB.disabled = historyIndex >= editHistory.length - 1;

        if (!strip || !histWrap) return;

        if (editHistory.length <= 1) { histWrap.style.display = 'none'; return; }
        histWrap.style.display = 'block';

        strip.innerHTML = '';
        editHistory.forEach((state, i) => {
            const thumb = document.createElement('div');
            thumb.className = 'version-thumb' + (i === historyIndex ? ' active' : '');
            thumb.title = `Version ${i + 1}`;
            thumb.innerHTML = `<img src="${state.dataUrl}" alt="V${i+1}"><span>V${i+1}</span>`;
            thumb.addEventListener('click', () => navigateHistory(i));
            strip.appendChild(thumb);
        });

        // Scroll active thumb into view
        strip.querySelector('.version-thumb.active')
            ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    // Back / Forward buttons
    undoBtn?.addEventListener('click', () => navigateHistory(historyIndex - 1));
    document.getElementById('redo-btn')?.addEventListener('click', () => navigateHistory(historyIndex + 1));

    // Copy caption
    document.getElementById('copy-btn')?.addEventListener('click', () => {
        if (!captionText?.textContent) return;
        navigator.clipboard.writeText(captionText.textContent).then(() => {
            const btn = document.getElementById('copy-btn');
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = 'Copy Caption', 2000);
        });
    });

    const regenBtn = document.getElementById('regenerate-btn');

    // ── Show Result ────────────────────────────────────────────────────────
    const showResult = (dataUrl, filename, caption, resetHistory = true) => {
        currentDataUrl  = dataUrl;
        currentFilename = filename;

        // Start a fresh history for every new base image
        if (resetHistory) {
            editHistory  = [{ dataUrl, filename, caption: caption || '' }];
            historyIndex = 0;
        }

        body.classList.add('result-mode');
        resultDisplay.innerHTML = '';
        if (variantsPicker) variantsPicker.style.display = 'none';
        heroArea.style.display = 'none';
        spiderContainer.style.display = 'none';
        inputContainer.classList.add('hidden');
        if (regenBtn) regenBtn.style.display = lastPrompt || lastImageBlob ? 'inline-block' : 'none';

        if (captionBox) {
            captionText.textContent = caption || '';
            captionBox.style.display = caption ? 'block' : 'none';
        }
        if (editSection) {
            editSection.style.display = 'block';
            setMode('edit');
            loadImageToCanvas(dataUrl);
        }
        updateHistoryUI();
    };

    // ── Variants Picker ────────────────────────────────────────────────────
    const showVariantsPicker = async (prompt, imageBlob) => {
        body.classList.add('result-mode');
        heroArea.style.display = 'none';
        inputContainer.classList.add('hidden');
        resultDisplay.innerHTML = '';
        if (editSection) editSection.style.display = 'none';
        if (captionBox)  captionBox.style.display  = 'none';

        variantsGrid.innerHTML = '';
        variantsPicker.style.display = 'flex';
        selectedVariant = null;
        useVariantBtn.disabled = true;

        // Build 3 loading cards immediately
        const cards = [1, 2, 3].map(i => {
            const card = document.createElement('div');
            card.className = 'variant-card';
            card.innerHTML = `
                <div class="variant-loading">
                    <div class="spinner"></div>
                    <span>Generating…</span>
                </div>
                <div class="variant-label">Option ${i}</div>`;
            variantsGrid.appendChild(card);
            return card;
        });

        const makeFd = () => {
            const fd = new FormData();
            if (prompt) fd.append('prompt', prompt);
            if (imageBlob) fd.append('image', imageBlob, 'image.png');
            return fd;
        };

        // Fire all 3 in parallel, fill cards as they arrive
        [0, 1, 2].forEach(i => {
            fetch(`${SERVER}/generate`, { method: 'POST', body: makeFd() })
                .then(r => r.json())
                .then(data => {
                    if (data.error || !data.image) {
                        cards[i].querySelector('.variant-loading').innerHTML = '<span style="color:#e53e3e">Failed</span>';
                        return;
                    }
                    cards[i].dataset.image    = data.image;
                    cards[i].dataset.filename = data.filename;
                    cards[i].dataset.caption  = data.caption || '';
                    cards[i].innerHTML = `
                        <img src="${data.image}" alt="Variant ${i+1}" />
                        <div class="variant-label">Option ${i+1}</div>`;
                    cards[i].onclick = () => {
                        document.querySelectorAll('.variant-card').forEach(c => c.classList.remove('selected'));
                        cards[i].classList.add('selected');
                        selectedVariant = { image: data.image, filename: data.filename, caption: data.caption };
                        useVariantBtn.disabled = false;
                    };
                })
                .catch(() => {
                    cards[i].querySelector('.variant-loading').innerHTML = '<span style="color:#e53e3e">Failed</span>';
                });
        });
    };

    useVariantBtn?.addEventListener('click', () => {
        if (!selectedVariant) return;
        showResult(selectedVariant.image, selectedVariant.filename, selectedVariant.caption);
        createHistoryElement(selectedVariant, true);
    });

    // ── Submission ─────────────────────────────────────────────────────────
    const handleSubmission = async () => {
        const val       = promptInput.value.trim();
        const hasImages = previewGallery?.children.length > 0;
        if (!val && !hasImages) return;

        const wantsVariants = variantsCheck?.checked;

        // Exit animations
        heroTitle?.classList.add('text-fade-exit');
        if (spiderContainer) {
            spiderContainer.classList.remove('dropping');
            void spiderContainer.offsetWidth;
            spiderContainer.classList.add('spider-exit');
        }

        // Show loading
        body.classList.add('result-mode');
        heroArea.style.display = 'none';
        inputContainer.classList.add('hidden');
        if (captionBox)      captionBox.style.display      = 'none';
        if (editSection)     editSection.style.display     = 'none';
        if (variantsPicker)  variantsPicker.style.display  = 'none';

        resultDisplay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>${wantsVariants ? 'Generating 3 variants…' : 'Generating your image…'}</p>
            </div>`;

        await new Promise(r => setTimeout(r, 650));
        spiderContainer.style.display = 'none';

        // Grab image blob once (reusable)
        const firstChip = previewGallery?.querySelector('img');
        const imageBlob = firstChip ? await (await fetch(firstChip.src)).blob() : null;

        // Store for Regenerate
        lastPrompt    = val;
        lastImageBlob = imageBlob;

        // Clear inputs
        const promptVal = val;
        promptInput.value = '';
        promptInput.style.height = 'auto';
        previewGallery.innerHTML = '';
        previewGallery.style.display = 'none';

        if (wantsVariants) {
            resultDisplay.innerHTML = '';
            await showVariantsPicker(promptVal, imageBlob);
            return;
        }

        // Single generation
        const fd = new FormData();
        if (promptVal) fd.append('prompt', promptVal);
        if (imageBlob) fd.append('image', imageBlob, 'image.png');

        try {
            const res  = await fetch(`${SERVER}/generate`, { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok || data.error) {
                resultDisplay.innerHTML = `<div class="error-box">${data.error || 'Something went wrong.'}</div>`;
                return;
            }
            resultDisplay.innerHTML = '';
            showResult(data.image, data.filename, data.caption);
            createHistoryElement({ image: data.image, filename: data.filename, caption: data.caption }, true);
        } catch {
            resultDisplay.innerHTML = `<div class="error-box">Could not reach the server. Make sure server.py is running on port 5000.</div>`;
        }
    };

    // ── Download ───────────────────────────────────────────────────────────
    document.getElementById('download-raw')?.addEventListener('click', () => {
        if (!currentDataUrl) return alert('No image to download!');
        const a = document.createElement('a');
        a.href = currentDataUrl; a.download = currentFilename || 'hero_image.png'; a.click();
    });

    document.getElementById('download-template')?.addEventListener('click', () => {
        if (!currentDataUrl) return alert('No image to download!');
        const a = document.createElement('a');
        a.href = currentDataUrl; a.download = (currentFilename || 'hero_image').replace(/(\.\w+)$/, '_template$1'); a.click();
    });

    // ── Upload ─────────────────────────────────────────────────────────────
    addBtn.onclick = () => fileUpload.click();
    fileUpload.onchange = function () {
        previewGallery.style.display = 'flex';
        Array.from(this.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const chip = document.createElement('div');
                chip.className = 'preview-chip';
                chip.innerHTML = `<img src="${e.target.result}"><button class="remove-chip-btn">&times;</button>`;
                chip.querySelector('button').onclick = () => {
                    chip.remove();
                    if (!previewGallery.children.length) previewGallery.style.display = 'none';
                };
                previewGallery.appendChild(chip);
            };
            reader.readAsDataURL(file);
        });
    };

    // ── New Session ────────────────────────────────────────────────────────
    newSessionBtn.onclick = () => {
        resultDisplay.innerHTML = '';
        if (captionBox)     captionBox.style.display     = 'none';
        if (editSection)    editSection.style.display    = 'none';
        if (variantsPicker) variantsPicker.style.display = 'none';
        body.classList.remove('result-mode');
        inputContainer.classList.remove('hidden');
        currentFilename = null; currentDataUrl = null; selectedVariant = null;
        editHistory = []; historyIndex = -1;
        if (regenBtn) regenBtn.style.display = 'none';
        clearSelection();
        applyTheme(localStorage.getItem('selected-theme') || 'light');
    };

    // ── UI Events ──────────────────────────────────────────────────────────
    menuToggle.onclick = (e) => { e.stopPropagation(); sidebar.classList.toggle('open'); };
    settingsBtn.onclick = (e) => { e.stopPropagation(); settingsModal.classList.add('open'); };
    closeModal.onclick = () => settingsModal.classList.remove('open');
    document.onclick = (e) => {
        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) sidebar.classList.remove('open');
        if (e.target === settingsModal) settingsModal.classList.remove('open');
    };

    submitBtn.onclick = handleSubmission;

    regenBtn?.addEventListener('click', async () => {
        if (!lastPrompt && !lastImageBlob) return;

        // Exit animation + loading state
        body.classList.add('result-mode');
        if (editSection)    editSection.style.display    = 'none';
        if (captionBox)     captionBox.style.display     = 'none';
        if (variantsPicker) variantsPicker.style.display = 'none';
        resultDisplay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Regenerating…</p>
            </div>`;

        const fd = new FormData();
        if (lastPrompt)    fd.append('prompt', lastPrompt);
        if (lastImageBlob) fd.append('image',  lastImageBlob, 'image.png');

        try {
            const res  = await fetch(`${SERVER}/generate`, { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok || data.error) {
                resultDisplay.innerHTML = `<div class="error-box">${data.error || 'Something went wrong.'}</div>`;
                return;
            }
            resultDisplay.innerHTML = '';
            showResult(data.image, data.filename, data.caption);
            createHistoryElement({ image: data.image, filename: data.filename, caption: data.caption }, true);
        } catch {
            resultDisplay.innerHTML = `<div class="error-box">Could not reach the server.</div>`;
        }
    });
    promptInput.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmission(); }
    };
    promptInput.oninput = function () {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    };

    // ── Card Overlay Rendering ─────────────────────────────────────────────
    function drawRoundRect(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.lineTo(x + w - r, y);
        c.quadraticCurveTo(x + w, y, x + w, y + r);
        c.lineTo(x + w, y + h - r);
        c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        c.lineTo(x + r, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - r);
        c.lineTo(x, y + r);
        c.quadraticCurveTo(x, y, x + r, y);
        c.closePath();
    }

    function prefillCardForm(char) {
        const nameEl = document.getElementById('card-name');
        if (nameEl) nameEl.value = char.name || '';

        document.querySelectorAll('.cp-type').forEach(b => b.classList.remove('active'));
        document.querySelector(`.cp-type[data-val="${char.type}"]`)?.classList.add('active');

        const rows    = document.querySelectorAll('#card-stats-grid .cs-row');
        const entries = Object.entries(char.stats || {});
        rows.forEach((row, i) => {
            row.querySelector('.cs-key').value = entries[i] ? entries[i][0] : '';
            row.querySelector('.cs-val').value = entries[i] ? entries[i][1] : '';
        });

        const p = document.getElementById('card-personality');
        const h = document.getElementById('card-hometown');
        const w = document.getElementById('card-weakness');
        if (p) p.value = char.personality || '';
        if (h) h.value = char.hometown    || '';
        if (w) w.value = char.weakness    || '';
    }

    function renderCardOverlay() {
        if (!ctx || !canvasImg.src) return;

        const W = canvas.width;
        const H = canvas.height;

        // Gather form values
        const name        = document.getElementById('card-name')?.value.trim()        || 'UNKNOWN';
        const type        = document.querySelector('.cp-type.active')?.dataset.val     || 'Hero';
        const personality = document.getElementById('card-personality')?.value.trim() || '';
        const hometown    = document.getElementById('card-hometown')?.value.trim()     || '';
        const weakness    = document.getElementById('card-weakness')?.value.trim()     || '';

        const stats = [];
        document.querySelectorAll('#card-stats-grid .cs-row').forEach(row => {
            const k = row.querySelector('.cs-key')?.value.trim();
            const v = row.querySelector('.cs-val')?.value.trim();
            if (k && v) stats.push([k, v]);
        });

        // 1 — Redraw clean base image
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(canvasImg, 0, 0);

        // 2 — Bottom gradient
        const gradH = H * 0.54;
        const grad  = ctx.createLinearGradient(0, H - gradH, 0, H);
        grad.addColorStop(0,    'rgba(0,0,0,0)');
        grad.addColorStop(0.28, 'rgba(0,0,0,0.72)');
        grad.addColorStop(1,    'rgba(0,0,0,0.97)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, H - gradH, W, gradH);

        // 3 — Gold outer border
        const bw = Math.max(4, W * 0.013);
        ctx.strokeStyle = 'rgba(212,175,55,0.92)';
        ctx.lineWidth   = bw;
        drawRoundRect(ctx, bw / 2, bw / 2, W - bw, H - bw, W * 0.025);
        ctx.stroke();

        // 4 — Inner subtle border
        const ib = bw + 5;
        ctx.strokeStyle = 'rgba(255,255,255,0.14)';
        ctx.lineWidth   = 1;
        drawRoundRect(ctx, ib, ib, W - ib * 2, H - ib * 2, W * 0.018);
        ctx.stroke();

        const px = W * 0.06;  // left padding
        const rx = W * 0.94;  // right edge

        // 5 — Character name
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur  = 12;
        ctx.textAlign   = 'left';
        ctx.fillStyle   = '#ffffff';
        const nameSize  = Math.min(W * 0.074, 82);
        ctx.font        = `800 ${nameSize}px 'Syne','Arial Black',Arial,sans-serif`;
        ctx.fillText(name.toUpperCase(), px, H * 0.672);

        // 6 — Type badge (right-aligned)
        ctx.textAlign = 'right';
        ctx.font      = `700 ${W * 0.033}px Arial,sans-serif`;
        ctx.fillStyle = type === 'Hero' ? '#60a5fa' : '#f87171';
        ctx.fillText(type.toUpperCase(), rx, H * 0.672);
        ctx.shadowBlur = 0;

        // 7 — Divider line
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth   = Math.max(1, W * 0.002);
        ctx.beginPath();
        ctx.moveTo(px, H * 0.692);
        ctx.lineTo(rx, H * 0.692);
        ctx.stroke();

        // 8 — Stat boxes
        if (stats.length > 0) {
            const cols     = Math.min(stats.length, 6);
            const zoneW    = W * 0.88;
            const colW     = zoneW / cols;
            const boxY     = H * 0.704;
            const boxH     = H * 0.132;
            const cornerR  = 7;

            stats.slice(0, 6).forEach(([key, val], i) => {
                const sx = px + i * colW;
                const cx = sx + colW / 2;

                // Box background
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                drawRoundRect(ctx, sx + 3, boxY, colW - 6, boxH, cornerR);
                ctx.fill();

                // Stat key
                ctx.textAlign = 'center';
                ctx.font      = `600 ${W * 0.026}px Arial,sans-serif`;
                ctx.fillStyle = 'rgba(255,255,255,0.52)';
                ctx.fillText(key.toUpperCase(), cx, boxY + boxH * 0.39);

                // Stat value
                ctx.font      = `bold ${Math.min(W * 0.048, 54)}px Arial,sans-serif`;
                ctx.fillStyle = '#ffffff';
                ctx.fillText(String(val), cx, boxY + boxH * 0.87);
            });
        }

        // 9 — Footer (personality · hometown · weakness)
        const footerParts = [personality, hometown, weakness].filter(Boolean);
        if (footerParts.length) {
            const footerY = H * 0.934;
            ctx.textAlign = 'left';
            ctx.font      = `${W * 0.022}px Arial,sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.38)';
            ctx.fillText(footerParts.join('  ·  '), px, footerY);
        }

        // Show Save button
        const saveBtn = document.getElementById('save-card-btn');
        if (saveBtn) saveBtn.style.display = 'inline-block';
    }

    // Wire Card buttons
    document.getElementById('render-card-btn')?.addEventListener('click', renderCardOverlay);

    document.getElementById('reset-card-btn')?.addEventListener('click', () => {
        redrawCanvas();
        const saveBtn = document.getElementById('save-card-btn');
        if (saveBtn) saveBtn.style.display = 'none';
    });

    document.getElementById('save-card-btn')?.addEventListener('click', () => {
        const charName = document.getElementById('card-name')?.value.trim() || 'hero';
        const link = document.createElement('a');
        link.href     = canvas.toDataURL('image/png');
        link.download = `${charName.replace(/\s+/g, '_').toLowerCase()}_card.png`;
        link.click();
    });

    // cp-type toggle
    document.querySelectorAll('.cp-type').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cp-type').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // ── Character Library Panel ────────────────────────────────────────────
    const charPanel    = document.getElementById('char-panel');
    const charPanelBtn = document.getElementById('char-panel-btn');
    const closeCharBtn = document.getElementById('close-char-panel');

    charPanelBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        charPanel.classList.toggle('open');
        // Close history sidebar if open
        sidebar.classList.remove('open');
    });
    closeCharBtn?.addEventListener('click', () => charPanel.classList.remove('open'));
    document.addEventListener('click', (e) => {
        if (charPanel && !charPanel.contains(e.target) && e.target !== charPanelBtn) {
            charPanel.classList.remove('open');
        }
    });

    function buildCharacterPrompt(char) {
        const statsStr = Object.entries(char.stats)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' · ');
        const traitsStr = char.traits.length ? ` Traits: ${char.traits.join(', ')}.` : '';
        return `Create an epic social media post for "${char.name}", a ${char.type} from ${char.hometown}.${traitsStr} Stats — ${statsStr}. Personality: ${char.personality}. Weakness: ${char.weakness}. Show them in a dramatic cinematic pose that captures their ${char.personality.toLowerCase()} nature. Bold, stylized, optimized for social media.`;
    }

    function renderCharCards() {
        const list = document.getElementById('char-list');
        if (!list) return;
        CHARACTERS.forEach(char => {
            const card = document.createElement('div');
            card.className = 'char-card';
            const badgeClass = char.type === 'Hero' ? 'hero' : 'villain';
            const topStats = Object.entries(char.stats).slice(0, 5)
                .map(([k, v]) => `<span>${k} <b>${v}</b></span>`).join('');
            card.innerHTML = `
                <div class="char-card-top">
                    <span class="char-type-badge ${badgeClass}">${char.type}</span>
                    <span class="char-hometown">${char.hometown}</span>
                </div>
                <div class="char-name">${char.name}</div>
                <div class="char-stats">${topStats}</div>
                <div class="char-personality">${char.personality} · ${char.weakness}</div>
            `;
            card.addEventListener('click', () => {
                promptInput.value = buildCharacterPrompt(char);
                promptInput.dispatchEvent(new Event('input'));
                charPanel.classList.remove('open');
                promptInput.focus();
            });
            list.appendChild(card);
        });
    }

    // Custom Template Form
    const customTemplateBtn = document.getElementById('custom-template-btn');
    const customForm        = document.getElementById('custom-form');

    customTemplateBtn?.addEventListener('click', () => {
        const isOpen = customForm.style.display !== 'none';
        customForm.style.display = isOpen ? 'none' : 'flex';
        customTemplateBtn.textContent = isOpen ? '+ Custom Template' : '✕ Close Template';
    });

    // cf-type toggle (Hero / Villain)
    document.querySelectorAll('.cf-type').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cf-type').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    document.getElementById('cf-generate-btn')?.addEventListener('click', () => {
        const name        = document.getElementById('cf-name')?.value.trim()        || 'Unknown Hero';
        const type        = document.querySelector('.cf-type.active')?.dataset.val  || 'Hero';
        const personality = document.getElementById('cf-personality')?.value.trim() || 'Mysterious';
        const hometown    = document.getElementById('cf-hometown')?.value.trim()    || 'Unknown City';
        const weakness    = document.getElementById('cf-weakness')?.value.trim()    || 'Unknown weakness';

        const stats = {};
        ['pwr','spd','def','int'].forEach(s => {
            const val = document.getElementById(`cf-${s}`)?.value;
            if (val !== '' && val !== undefined) stats[s.toUpperCase()] = Number(val);
        });

        const char = { name, type, traits: [], stats, personality, hometown, weakness };
        promptInput.value = buildCharacterPrompt(char);
        promptInput.dispatchEvent(new Event('input'));
        charPanel.classList.remove('open');
        customForm.style.display = 'none';
        customTemplateBtn.textContent = '+ Custom Template';
        promptInput.focus();
    });

    // ── Init ───────────────────────────────────────────────────────────────
    applyTheme(localStorage.getItem('selected-theme') || 'light');
    loadSavedHistory();
    renderCharCards();
});
