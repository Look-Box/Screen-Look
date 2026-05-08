// ==========================================
// 1. GLOBAL VARIABLES & DOM ELEMENTS
// ==========================================
const uiLayer = document.getElementById('ui-layer');
const textControlsPanel = document.getElementById('text-edit-controls');
const shapeContainer = document.getElementById('shape-container');
const mediaWrapper = document.getElementById('media-wrapper');
const video = document.getElementById('v4k-video');
const canvas = document.getElementById('draw-layer');
const ctx = canvas.getContext('2d');

// UI Buttons & Inputs
const btnDraw = document.getElementById('btn-draw');
const btnEraser = document.getElementById('btn-eraser');
const btnText = document.getElementById('btn-text');
const btnCircle = document.getElementById('btn-circle');
const btnSquare = document.getElementById('btn-square');

const drawSettings = document.getElementById('draw-settings');
const drawColorWrapper = document.getElementById('draw-color-wrapper');
const colorPicker = document.getElementById('color-picker');
const lineWidthSlider = document.getElementById('line-width');

const dotDraw = document.getElementById('dot-draw');
const dotShape = document.getElementById('dot-shape');
const dotCam = document.getElementById('dot-cam');

// Floating Text UI Inputs
const floatingColor = document.getElementById('floating-color');
const floatingSize = document.getElementById('floating-size');
const sizeReadout = document.getElementById('size-readout');

// Custom Font Dropdown Elements
const fontDropdown = document.getElementById('font-dropdown');
const fontSelected = document.getElementById('font-selected');
const fontOptions = document.getElementById('font-options');
const fontOptionItems = document.querySelectorAll('.dropdown-option');

// State Trackers
let idleTimeout;
let activeTool = 'cursor'; 
let isMirrored = false;
let isRotated = false;
let isDrawing = false;
let isCreatingShape = false;
let currentShape = null;
let selectedText = null; 
let startX = 0, startY = 0;

const presetColors = ['#ff3b30', '#ff9f0a', '#ffcc00', '#34c759', '#0a84ff', '#bf5af2', '#ffffff', '#000000'];
let currentColorIndex = 0;

// ==========================================
// 2. INITIALIZATION (Canvas Sizing)
// ==========================================
function resizeCanvas() {
    canvas.width = mediaWrapper.clientWidth;
    canvas.height = mediaWrapper.clientHeight;
    if(selectedText) updateTextControlsPosition();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); 

// ==========================================
// 3. AUTO-HIDE MOUSE & UI LOGIC
// ==========================================
document.addEventListener('mousemove', (e) => {
    document.body.style.cursor = 'default';

    if (e.clientY > window.innerHeight - 160) {
        uiLayer.classList.remove('hidden');
    } else {
        uiLayer.classList.add('hidden');
    }

    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
        if (!isDrawing && !isCreatingShape && activeTool !== 'text' && !selectedText) {
            document.body.style.cursor = 'none';
            uiLayer.classList.add('hidden');
        }
    }, 2500);
});

// ==========================================
// 4. CORE TOOL SELECTION & ACTIONS
// ==========================================
function handleDrawAction() {
    if (activeTool === 'draw') {
        if (currentColorIndex === presetColors.length - 1) {
            currentColorIndex = 0;
            setTool('cursor');
        } else {
            currentColorIndex++;
            colorPicker.value = presetColors[currentColorIndex];
            updateDrawDotColor();
        }
    } else {
        setTool('draw');
        currentColorIndex = 0;
        colorPicker.value = presetColors[currentColorIndex];
        updateDrawDotColor();
    }
}

function updateDrawDotColor() {
    const color = colorPicker.value;
    dotDraw.style.background = color;
    dotDraw.style.boxShadow = `0 0 10px ${color}`;
    
    const isLight = (color === '#ffffff' || color === '#ffcc00' || color === '#34c759');
    dotDraw.style.color = isLight ? 'black' : 'white';
    dotDraw.innerText = 'D';
}

// Main Draw Toolbar Events
colorPicker.addEventListener('input', () => {
    if (activeTool !== 'draw') setTool('draw');
    updateDrawDotColor();
});

function setTool(tool) {
    if (activeTool === tool) tool = 'cursor';
    activeTool = tool;

    btnDraw.classList.remove('active');
    btnEraser.classList.remove('active');
    btnText.classList.remove('active');
    btnCircle.classList.remove('active');
    btnSquare.classList.remove('active');
    
    canvas.style.pointerEvents = 'none';
    shapeContainer.style.pointerEvents = 'none';
    drawSettings.style.display = 'none';
    
    dotDraw.className = 'status-dot';
    dotDraw.style.background = '';
    dotDraw.style.boxShadow = '';
    dotDraw.style.color = '';
    dotShape.className = 'status-dot';
    dotDraw.innerText = '';
    dotShape.innerText = '';

    if (tool === 'draw') {
        btnDraw.classList.add('active');
        canvas.style.pointerEvents = 'auto';
        canvas.style.cursor = 'crosshair';
        drawColorWrapper.style.display = 'flex'; // Show color picker
        drawSettings.style.display = 'flex'; 
        updateDrawDotColor(); 
    } 
    else if (tool === 'eraser') {
        btnEraser.classList.add('active');
        canvas.style.pointerEvents = 'auto';
        canvas.style.cursor = 'cell';
        dotDraw.classList.add('dot-orange');
        dotDraw.innerText = 'E';
        drawColorWrapper.style.display = 'none'; // Hide color picker, keep size
        drawSettings.style.display = 'flex'; 
    }
    else if (tool === 'text') {
        btnText.classList.add('active');
        shapeContainer.style.pointerEvents = 'auto';
        shapeContainer.style.cursor = 'text';
        dotShape.classList.add('dot-orange');
        dotShape.innerText = 'T';
    }
    else if (tool === 'circle' || tool === 'square') {
        if(tool === 'circle') btnCircle.classList.add('active');
        if(tool === 'square') btnSquare.classList.add('active');
        
        shapeContainer.style.pointerEvents = 'auto'; 
        shapeContainer.style.cursor = 'crosshair';
        dotShape.classList.add('dot-purple');
        dotShape.innerText = tool === 'circle' ? 'C' : 'S';
    }
}

function executeAction(action) {
    if (action !== 'clear') setTool('cursor'); 

    if (action === 'mirror') {
        isMirrored = !isMirrored;
        updateTransforms();
    } else if (action === 'rotate') {
        isRotated = !isRotated;
        updateTransforms();
    } else if (action === 'clear') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else if (action === 'fullscreen') {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
    }
}

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.isContentEditable) return;
    switch(e.key) {
        case '1': pickV4K(); break;
        case '2': executeAction('fullscreen'); break;
        case '3': executeAction('mirror'); break;
        case '4': executeAction('rotate'); break;
        case '5': executeAction('clear'); break;
        case '6': handleDrawAction(); break;
        case '7': setTool('eraser'); break;
        case '8': setTool('circle'); break;
        case '9': setTool('square'); break;
        case 't': case 'T': setTool('text'); break;
        case 'i': case 'I': triggerImageUpload(); break;
        case 'Escape': setTool('cursor'); deselectText(); break;
    }
});

// ==========================================
// 5. CAMERA & VIEW TRANSFORMS
// ==========================================
async function pickV4K() {
    setTool('cursor');
    try {
        const usbDevice = await navigator.usb.requestDevice({ filters: [] });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        
        let targetId = null;
        videoDevices.forEach(device => {
            if (device.label.includes(usbDevice.productName) || device.label.toLowerCase().includes("v4k")) {
                targetId = device.deviceId;
            }
        });

        const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: targetId ? { exact: targetId } : undefined, width: { ideal: 3840 }, height: { ideal: 2160 } }
        });
        video.srcObject = stream;
        
        document.getElementById('btn-cam').classList.add('active');
        dotCam.className = 'status-dot dot-green';
    } catch (err) { console.error(err); }
}

function updateTransforms() {
    mediaWrapper.className = '';
    if (isMirrored) mediaWrapper.classList.add('mirror');
    if (isRotated) mediaWrapper.classList.add('rotate180');
}

// ==========================================
// 6. PEN & ERASER LOGIC
// ==========================================
canvas.addEventListener('mousedown', (e) => {
    if (activeTool !== 'draw' && activeTool !== 'eraser') return;
    isDrawing = true; 
    
    ctx.beginPath(); 
    ctx.moveTo(e.offsetX, e.offsetY);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (activeTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = lineWidthSlider.value * 2; 
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = colorPicker.value;
        ctx.lineWidth = lineWidthSlider.value;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing || (activeTool !== 'draw' && activeTool !== 'eraser')) return;
    ctx.lineTo(e.offsetX, e.offsetY); 
    ctx.stroke();
});

window.addEventListener('mouseup', () => { 
    if(isDrawing) {
        isDrawing = false; 
        ctx.closePath(); 
    }
});

// ==========================================
// 7. ADVANCED TEXT CONTROLS UI
// ==========================================

// Custom Font Dropdown Logic
fontSelected.addEventListener('click', (e) => {
    fontOptions.classList.toggle('show');
    e.stopPropagation();
});

fontOptionItems.forEach(item => {
    item.addEventListener('click', (e) => {
        const value = e.target.getAttribute('data-value');
        const name = e.target.innerText;
        const fontFam = e.target.style.fontFamily;
        
        fontSelected.innerText = name;
        fontSelected.style.fontFamily = fontFam;
        fontOptions.classList.remove('show');
        
        if (selectedText) {
            selectedText.style.fontFamily = value;
            updateTextControlsPosition();
        }
        e.stopPropagation();
    });
});

// Live Text Edit Event Listeners
floatingColor.addEventListener('input', (e) => {
    if (selectedText) selectedText.style.color = e.target.value;
});

floatingSize.addEventListener('input', (e) => {
    sizeReadout.innerText = e.target.value + 'px';
    if (selectedText) {
        selectedText.style.fontSize = e.target.value + 'px';
        updateTextControlsPosition();
    }
});

// Helper to extract hex from element computed style color
function rgbToHex(rgb) {
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return rgb; 
    function hex(x) { return ("0" + parseInt(x).toString(16)).slice(-2); }
    return "#" + hex(match[1]) + hex(match[2]) + hex(match[3]);
}

function updateTextControlsPosition() {
    if (!selectedText) return;
    const rect = selectedText.getBoundingClientRect();
    textControlsPanel.style.left = Math.max(20, rect.left) + 'px';
    textControlsPanel.style.top = (rect.bottom + 15) + 'px';
}

function selectTextElement(el) {
    if (selectedText && selectedText !== el) deselectText();
    
    selectedText = el;
    el.classList.add('selected');

    // Sync floating menu values with the text element
    const styles = window.getComputedStyle(el);
    floatingColor.value = rgbToHex(styles.color);
    
    const fontSizePx = Math.round(parseFloat(styles.fontSize));
    floatingSize.value = fontSizePx;
    sizeReadout.innerText = fontSizePx + 'px';
    
    const currentFont = styles.fontFamily.replace(/"/g, "'");
    
    // Sync Custom Font Dropdown UI
    let foundFont = false;
    fontOptionItems.forEach(opt => {
        if(opt.getAttribute('data-value').includes(currentFont.split(',')[0])) {
            fontSelected.innerText = opt.innerText;
            fontSelected.style.fontFamily = opt.style.fontFamily;
            foundFont = true;
        }
    });
    if(!foundFont) {
        fontSelected.innerText = 'Default';
        fontSelected.style.fontFamily = 'system-ui, sans-serif';
    }

    textControlsPanel.classList.remove('hidden');
    updateTextControlsPosition();
}

function enterTextEditMode(el) {
    if(selectedText !== el) selectTextElement(el);
    
    el.contentEditable = true;
    el.focus();
    
    // Auto select text if it is the default phrase
    if (el.innerText === 'Double click to edit') {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
    
    el.addEventListener('input', updateTextControlsPosition);
}

function deselectText() {
    if (!selectedText) return;
    
    selectedText.classList.remove('selected');
    selectedText.contentEditable = false;
    selectedText.removeEventListener('input', updateTextControlsPosition);
    fontOptions.classList.remove('show');
    
    if (selectedText.innerText.trim() === '') {
        selectedText.remove();
    }

    selectedText = null;
    textControlsPanel.classList.add('hidden');
}

function deleteActiveText() {
    if (!selectedText) return;
    selectedText.remove();
    selectedText = null;
    textControlsPanel.classList.add('hidden');
    fontOptions.classList.remove('show');
}

// Window clicks (Close menus, deselect items)
window.addEventListener('mousedown', (e) => {
    // Close font dropdown if clicked outside
    if (!fontDropdown.contains(e.target)) {
        fontOptions.classList.remove('show');
    }
    
    // Auto-finish editing if clicking outside the text and outside the text controls
    if (selectedText) {
        if (e.target !== selectedText && !textControlsPanel.contains(e.target)) {
            deselectText();
        }
    }
});

// ==========================================
// 8. SHAPE & TEXT CREATION
// ==========================================
function getAdjustedCoords(e) {
    const rect = shapeContainer.getBoundingClientRect();
    let nx = (e.clientX - rect.left) / rect.width;
    let ny = (e.clientY - rect.top) / rect.height;

    if (isMirrored && !isRotated) nx = 1 - nx;
    else if (!isMirrored && isRotated) { nx = 1 - nx; ny = 1 - ny; }
    else if (isMirrored && isRotated) ny = 1 - ny; 

    return { x: nx * rect.width, y: ny * rect.height };
}

shapeContainer.addEventListener('mousedown', (e) => {
    if (e.target !== shapeContainer) return;

    if (activeTool === 'text') {
        const coords = getAdjustedCoords(e);
        
        const textEl = document.createElement('div');
        textEl.className = 'draggable-text';
        textEl.style.left = coords.x + 'px';
        textEl.style.top = coords.y + 'px';
        textEl.style.color = floatingColor.value || '#ffffff';
        textEl.style.fontSize = floatingSize.value + 'px';
        
        // Get currently active font from our custom dropdown
        let currentFontVal = 'system-ui, sans-serif';
        fontOptionItems.forEach(opt => {
            if(opt.innerText === fontSelected.innerText) currentFontVal = opt.getAttribute('data-value');
        });
        textEl.style.fontFamily = currentFontVal;
        
        textEl.innerText = 'Double click to edit'; 

        shapeContainer.appendChild(textEl);
        makeDraggable(textEl);
        
        // Select it automatically to show controls beneath it
        selectTextElement(textEl);

        setTool('cursor'); 
        return;
    }

    if (activeTool !== 'circle' && activeTool !== 'square') return;
    
    isCreatingShape = true;
    const coords = getAdjustedCoords(e);
    startX = coords.x;
    startY = coords.y;

    currentShape = document.createElement('div');
    currentShape.className = `draggable-shape ${activeTool === 'circle' ? 'shape-circle' : ''}`;
    currentShape.style.left = startX + 'px';
    currentShape.style.top = startY + 'px';
    currentShape.style.width = '0px';
    currentShape.style.height = '0px';

    shapeContainer.appendChild(currentShape);
});

window.addEventListener('mousemove', (e) => {
    if (!isCreatingShape || !currentShape) return;
    
    const coords = getAdjustedCoords(e);
    const currentX = coords.x;
    const currentY = coords.y;

    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const left = Math.min(currentX, startX);
    const top = Math.min(currentY, startY);

    currentShape.style.width = width + 'px';
    currentShape.style.height = height + 'px';
    currentShape.style.left = left + 'px';
    currentShape.style.top = top + 'px';
});

window.addEventListener('mouseup', () => {
    if (isCreatingShape && currentShape) {
        makeDraggable(currentShape);
        setTool('cursor');
    }
    isCreatingShape = false;
    currentShape = null;
});

// ==========================================
// 9. IMAGE UPLOAD LOGIC
// ==========================================
function triggerImageUpload() {
    setTool('cursor');
    document.getElementById('image-upload').click();
}

document.getElementById('image-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'draggable-img';
        imgWrapper.style.left = '30%';
        imgWrapper.style.top = '20%';

        const img = document.createElement('img');
        img.src = event.target.result;
        img.draggable = false; 

        imgWrapper.appendChild(img);
        shapeContainer.appendChild(imgWrapper);
        
        makeDraggable(imgWrapper);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; 
});

// ==========================================
// 10. DRAGGING & EDITING SYSTEM
// ==========================================
function makeDraggable(el) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let clickStartX = 0, clickStartY = 0;
    let hasDragged = false;

    el.onmousedown = dragMouseDown;
    
    // Setup Double Click to Edit
    el.ondblclick = (e) => {
        if (el.classList.contains('draggable-text')) {
            e.stopPropagation();
            enterTextEditMode(el);
        }
    };

    function dragMouseDown(e) {
        if (activeTool === 'draw' || activeTool === 'eraser') return;
        if (el.contentEditable === "true") return; 

        e.preventDefault();
        e.stopPropagation(); 
        
        pos3 = e.clientX; 
        pos4 = e.clientY;
        clickStartX = e.clientX;
        clickStartY = e.clientY;
        hasDragged = false;
        
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        hasDragged = true;
        let dx = pos3 - e.clientX;
        let dy = pos4 - e.clientY;
        
        if (isMirrored && !isRotated) dx = -dx;
        else if (!isMirrored && isRotated) { dx = -dx; dy = -dy; }
        else if (isMirrored && isRotated) dy = -dy; 

        pos1 = dx; pos2 = dy;
        pos3 = e.clientX; pos4 = e.clientY;
        
        el.style.top = (el.offsetTop - pos2) + "px";
        el.style.left = (el.offsetLeft - pos1) + "px";
        
        if (el === selectedText) updateTextControlsPosition();
    }

    function closeDragElement(e) {
        document.onmouseup = null; 
        document.onmousemove = null;
        
        let moveDistance = Math.abs(e.clientX - clickStartX) + Math.abs(e.clientY - clickStartY);
        
        if (!hasDragged || moveDistance < 5) {
            if (el.classList.contains('draggable-text')) {
                if (el.contentEditable !== "true") {
                    selectTextElement(el);
                }
            } else {
                el.remove(); 
            }
        } else if (hasDragged && el.classList.contains('draggable-text')) {
            selectTextElement(el); 
        }
    }
}
