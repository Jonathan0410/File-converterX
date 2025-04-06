
const themeSwitch = document.getElementById('themeSwitch');
themeSwitch.addEventListener('change', () => {
  document.body.classList.toggle('dark');
});

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  document.getElementById(tabId).style.display = 'block';
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 3000);
}

function setProgress(percent) {
  document.getElementById('progressBar').style.width = percent + '%';
}

const imageInput = document.getElementById('imageInput');
const imageDropZone = document.getElementById('imageDropZone');
const imagePreview = document.getElementById('imagePreview');

imageDropZone.addEventListener('click', () => imageInput.click());
imageDropZone.addEventListener('dragover', e => {
  e.preventDefault();
  imageDropZone.style.backgroundColor = '#eee';
});
imageDropZone.addEventListener('dragleave', () => imageDropZone.style.backgroundColor = '');
imageDropZone.addEventListener('drop', e => {
  e.preventDefault();
  imageDropZone.style.backgroundColor = '';
  handleImages(e.dataTransfer.files);
});
imageInput.addEventListener('change', () => handleImages(imageInput.files));

let images = [];
function handleImages(files) {
  images = Array.from(files);
  imagePreview.innerHTML = '';
  images.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement('img');
      img.src = e.target.result;
      imagePreview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

document.getElementById('convertBtn').addEventListener('click', async () => {
  if (images.length === 0) return showToast("No images uploaded!");
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  setProgress(10);
  for (let i = 0; i < images.length; i++) {
    const img = new Image();
    img.src = URL.createObjectURL(images[i]);
    await new Promise(resolve => {
      img.onload = () => {
        const ratio = img.width / img.height;
        const pdfWidth = 210;
        const pdfHeight = 210 / ratio;
        if (i > 0) pdf.addPage();
        pdf.addImage(img, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        resolve();
      };
    });
    setProgress((i + 1) / images.length * 100);
  }
  pdf.save("converted.pdf");
  showToast("PDF Downloaded");
  setProgress(0);
});

const pdfInput = document.getElementById('pdfInput');
const pdfDropZone = document.getElementById('pdfDropZone');
const pdfPreview = document.getElementById('pdfPreview');
const downloadAllBtn = document.getElementById('downloadAllBtn');

pdfDropZone.addEventListener('click', () => pdfInput.click());
pdfDropZone.addEventListener('dragover', e => {
  e.preventDefault();
  pdfDropZone.style.backgroundColor = '#eee';
});
pdfDropZone.addEventListener('dragleave', () => pdfDropZone.style.backgroundColor = '');
pdfDropZone.addEventListener('drop', e => {
  e.preventDefault();
  pdfDropZone.style.backgroundColor = '';
  handlePDF(e.dataTransfer.files[0]);
});
pdfInput.addEventListener('change', () => handlePDF(pdfInput.files[0]));

async function handlePDF(file) {
  if (!file) return;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  pdfPreview.innerHTML = '';
  const zip = new JSZip();

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport: viewport }).promise;

    const imgURL = canvas.toDataURL();
    const img = new Image();
    img.src = imgURL;
    pdfPreview.appendChild(img);

    const link = document.createElement('a');
    link.href = imgURL;
    link.download = `page_${i}.png`;
    link.textContent = `Download Page ${i}`;
    link.className = 'btn';
    pdfPreview.appendChild(link);

    zip.file(`page_${i}.png`, imgURL.split(',')[1], { base64: true });
    setProgress((i / pdf.numPages) * 100);
  }

  downloadAllBtn.style.display = 'inline-block';
  downloadAllBtn.onclick = async () => {
    const content = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = 'pdf_images.zip';
    a.click();
  };
  showToast("Images ready to download");
  setProgress(0);
}

const wordDropZone = document.getElementById('wordDropZone');
const wordInput = document.getElementById('wordInput');
const wordPreview = document.getElementById('wordPreview');
const convertWordToPdfBtn = document.getElementById('convertWordToPdfBtn');

wordDropZone.addEventListener('click', () => wordInput.click());

wordDropZone.addEventListener('dragover', (e) => e.preventDefault());

wordDropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  wordInput.files = e.dataTransfer.files;
  handleWordFile();
});

wordInput.addEventListener('change', handleWordFile);

function handleWordFile() {
  const file = wordInput.files[0];
  if (!file) return;

  wordPreview.innerHTML = `<p>Rendering preview...</p>`;

  const reader = new FileReader();
  reader.onload = function (e) {
    const arrayBuffer = e.target.result;

    mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
      .then(result => {
        wordPreview.innerHTML = `<div id="docContent" style="background: white; padding: 20px;">${result.value}</div>`;
        convertWordToPdfBtn.style.display = 'inline-block';
      })
      .catch(err => {
        wordPreview.innerHTML = `<p style="color: red;">Failed to extract content</p>`;
        console.error(err);
      });
  };

  reader.readAsArrayBuffer(file);
}

convertWordToPdfBtn.addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'pt', 'a4');

  html2canvas(document.getElementById('docContent')).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 595.28;
    const pageHeight = 841.89;
    const imgHeight = canvas.height * imgWidth / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save("converted-with-layout.pdf");
  });
});
const pdfToWordDropZone = document.getElementById('pdfToWordDropZone');
const pdfToWordInput = document.getElementById('pdfToWordInput');
const convertPdfToWordBtn = document.getElementById('convertPdfToWordBtn');
const pdfToWordPreview = document.getElementById('pdfToWordPreview');

pdfToWordDropZone.onclick = () => pdfToWordInput.click();
pdfToWordDropZone.ondragover = (e) => e.preventDefault();
pdfToWordDropZone.ondrop = (e) => {
  e.preventDefault();
  pdfToWordInput.files = e.dataTransfer.files;
  showConvertPdfToWord();
};
pdfToWordInput.onchange = showConvertPdfToWord;

function showConvertPdfToWord() {
  const file = pdfToWordInput.files[0];
  if (file) {
    pdfToWordPreview.innerHTML = `<p>Ready to convert: ${file.name}</p>`;
    convertPdfToWordBtn.style.display = 'inline-block';
  }
}

convertPdfToWordBtn.onclick = () => {
  alert("For actual PDF to Word conversion, backend is needed. Placeholder button only.");
};

const pdfPageDropZone = document.getElementById('pdfPageDropZone');
const pdfPageInput = document.getElementById('pdfPageInput');
const removePagesBtn = document.getElementById('removePagesBtn');
const pdfPagePreview = document.getElementById('pdfPagePreview');
const pagesToRemoveInput = document.getElementById('pagesToRemove');

pdfPageDropZone.onclick = () => pdfPageInput.click();
pdfPageDropZone.ondragover = (e) => e.preventDefault();
pdfPageDropZone.ondrop = (e) => {
  e.preventDefault();
  pdfPageInput.files = e.dataTransfer.files;
  showPdfPageRemover();
};
pdfPageInput.onchange = showPdfPageRemover;

function showPdfPageRemover() {
  const file = pdfPageInput.files[0];
  if (file) {
    pdfPagePreview.innerHTML = `<p>Loaded: ${file.name}</p>`;
    removePagesBtn.style.display = 'inline-block';
  }
}

removePagesBtn.onclick = () => {
  alert("Client-side page removal from PDF requires backend or wasm tools. Placeholder only.");
};

const imageResizeDropZone = document.getElementById('imageResizeDropZone');
const imageResizeInput = document.getElementById('imageResizeInput');
const imageResizePreview = document.getElementById('imageResizePreview');
const resizeImageBtn = document.getElementById('resizeImageBtn');

imageResizeDropZone.onclick = () => imageResizeInput.click();
imageResizeDropZone.ondragover = (e) => e.preventDefault();
imageResizeDropZone.ondrop = (e) => {
  e.preventDefault();
  imageResizeInput.files = e.dataTransfer.files;
  showImageResize();
};
imageResizeInput.onchange = showImageResize;

function showImageResize() {
  const file = imageResizeInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      imageResizePreview.innerHTML = `<img src="${e.target.result}" id="imageToResize" style="max-width:100%;"/>`;
      resizeImageBtn.style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
  }
}

resizeImageBtn.onclick = () => {
  const img = document.getElementById('imageToResize');
  const width = parseInt(document.getElementById('resizeWidth').value);
  const height = parseInt(document.getElementById('resizeHeight').value);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  const link = document.createElement('a');
  link.download = 'resized-image.png';
  link.href = canvas.toDataURL();
  link.click();
};


const removerDropZone = document.getElementById("pdfRemoverDropZone");
const removerInput = document.getElementById("pdfRemoverInput");
const pageList = document.getElementById("pdfPageList");
const removeBtn = document.getElementById("removePagesBtn");

let pdfBytes = null;

removerDropZone.addEventListener("click", () => removerInput.click());

removerDropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  removerDropZone.style.borderColor = "#5cb85c";
});

removerDropZone.addEventListener("dragleave", () => {
  removerDropZone.style.borderColor = "#ccc";
});

removerDropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  removerDropZone.style.borderColor = "#ccc";
  const file = e.dataTransfer.files[0];
  if (file.type === "application/pdf") {
    loadPdfFile(file);
  } else {
    alert("Only PDF files are allowed.");
  }
});

removerInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file.type === "application/pdf") {
    loadPdfFile(file);
  }
});

async function loadPdfFile(file) {
  const reader = new FileReader();
  reader.onload = async function (e) {
    pdfBytes = new Uint8Array(e.target.result);
    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    let html = `<h3>Select Pages to Remove:</h3>`;
    for (let i = 0; i < totalPages; i++) {
      html += `
        <label>
          <input type="checkbox" value="${i}" class="page-checkbox" />
          Page ${i + 1}
        </label>`;
    }
    pageList.innerHTML = html;
    removeBtn.style.display = "inline-block";
  };
  reader.readAsArrayBuffer(file);
}

removeBtn.addEventListener("click", async () => {
  const checkboxes = document.querySelectorAll(".page-checkbox:checked");
  const removeIndices = Array.from(checkboxes).map(cb => parseInt(cb.value));

  const originalDoc = await PDFLib.PDFDocument.load(pdfBytes);
  const newDoc = await PDFLib.PDFDocument.create();
  const totalPages = originalDoc.getPageCount();

  if (removeIndices.length >= totalPages) {
    alert("You can't remove all the pages!");
    return;
  }

  for (let i = 0; i < totalPages; i++) {
    if (!removeIndices.includes(i)) {
      const [copiedPage] = await newDoc.copyPages(originalDoc, [i]);
      newDoc.addPage(copiedPage);
    }
  }

  const newPdfBytes = await newDoc.save();
  const blob = new Blob([newPdfBytes], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "pages-removed.pdf";
  link.click();
});

function switchTab(tabId) {
    const allTabs = document.querySelectorAll('.tab-content');
    allTabs.forEach(tab => tab.style.display = 'none');
  
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
      selectedTab.style.display = 'block';
      window.scrollTo({ top: selectedTab.offsetTop - 50, behavior: 'smooth' });
    }
  
    const allButtons = document.querySelectorAll('header button');
    allButtons.forEach(btn => btn.classList.remove('active'));
  
    const activeBtn = Array.from(allButtons).find(btn => btn.getAttribute('onclick')?.includes(tabId));
    if (activeBtn) activeBtn.classList.add('active');
  }
  function switchTab(tabId) {
    const allTabs = document.querySelectorAll('.tab-content');
    allTabs.forEach(tab => tab.style.display = 'none');
  
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
      selectedTab.style.display = 'block';
      window.scrollTo({ top: selectedTab.offsetTop - 50, behavior: 'smooth' });
    } else {
      console.warn(`No tab found with id: ${tabId}`);
    }
  }

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}

window.onload = function () {
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
  }
};

    
