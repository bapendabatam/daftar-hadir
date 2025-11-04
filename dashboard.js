const URL_APP = 'https://script.google.com/macros/s/AKfycbxCRYG03KUFyjTtfklk39f24HtfefWdmKGMgxGI9nVE1CfPH7eKB7F8l9tVCWHobUin/exec';

const params = new URLSearchParams(window.location.search);
const noAcara = params.get('acara'); // ambil noAcara dari URL

const status = document.getElementById("status");
const divJmlInst = document.getElementById("jml-instansi");
const divProgressInstansi = document.getElementById("progress-instansi");

let currentVersion = null;
const ol = document.getElementById("instansi-blm-hadir");
ol.innerHTML = '';

let jmlInstansi = 0;
let jmlInstansiHadir = 0;

// Ambil konfigurasi acara
async function setAcara() {
	status.innerHTML = `<div class="loading"><div class="loading-icon"></div><div>Setup acara...</div></div>`;

	try {
		 const res = await fetch(URL_APP, {
 		 	method: 'POST',
 		 	headers: {
  				'Content-Type': 'text/plain;charset=utf-8'
  			},
  			body: JSON.stringify({ 
				action: 'getAcaraConf',
				acara: noAcara
			})
		});

		const data = await res.json();
 		return data;
	} catch (err) {
		console.error('Error getAcaraConf:', err);
	}
}

async function getJmlInstansi() {
	status.innerHTML = `<div class="loading"><div class="loading-icon"></div><div>Mengambil Jumlah Instansi...</div></div>`;
	
	try {
		const res = await fetch(URL_APP, {
			method: "POST",
			headers: { "Content-Type": "text/plain;charset=utf-8" },
			body: JSON.stringify({ action: "getJmlInstansi", acara: noAcara })
		});
		const data = await res.json();
		return data.total;
	} catch (err) {
		console.error(err);
		return 0;
	}
}

// Render daftar dan progress instansi
function renderInstBlmHadir(data, jmlInstansiHadir) {
	const wrapper = document.getElementById("instansi-blm-hadir");
	wrapper.innerHTML = '';

	// Kalau semua kategori kosong
	const totalKosong = Object.values(data).every(arr => arr.length === 0);
	if (totalKosong) {
		wrapper.innerHTML = '<p>Semua Instansi/OPD sudah Hadir.</p>';
		return;
	}

	// Loop per kategori
	Object.entries(data).forEach(([kategori, list]) => {
		// Skip kosong
		if (!Array.isArray(list) || list.length === 0) return;

		// Wrapper grup
		const grupDiv = document.createElement('div');
		grupDiv.className = 'grup-wrapper';

		// Tambahkan header kategori
		const header = document.createElement('div');
		header.className = 'grup-header';
		header.textContent = kategori.toUpperCase();
		grupDiv.appendChild(header);

		// Tambah list instansi/opd dalam grup
		const ol = document.createElement('ol');
		ol.className = 'grup-list';
		
		list.forEach(nama => {
			const li = document.createElement('li');
			li.className = 'instansi-item';
			li.textContent = nama;
			ol.appendChild(li);
		});

		grupDiv.appendChild(ol);
		wrapper.appendChild(grupDiv);
	});


	// Hitung total instansi belum hadir
	const jmlInstBlmHadir = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
	divJmlInst.innerHTML = `${jmlInstBlmHadir} dari ${jmlInstansi}`;

	const bar = document.getElementById("progress-instansi-bar");
	const text = document.getElementById("progress-instansi-text");
	const persenInstHadir = ((jmlInstansiHadir / jmlInstansi) * 100).toFixed(1);

	bar.style.width = `${persenInstHadir}%`;
	text.textContent = `${jmlInstansiHadir} / ${jmlInstansi} (${persenInstHadir}%)`;
}

async function getInstBlmHadir() {
	status.innerHTML = `<div class="loading"><div class="loading-icon"></div><div>Mengambil Instansi yang Belum Hadir...</div></div>`;
	
	try {
		const res = await fetch(URL_APP, {
			method: "POST",
			headers: { "Content-Type": "text/plain;charset=utf-8" },
			body: JSON.stringify({ action: "getInstBlmHadir", acara: noAcara })
		});
		const data = await res.json();
		return data;
	} catch (err) {
		console.error(err);
		return null;
	}
}

async function startRealtime() {
	const res = await getInstBlmHadir();
	if (!res) return;

	currentVersion = res.version;
	
	// update render pertama kali
	await updateRender(res);
	
	const updateTime = new Date().toLocaleString();
	document.getElementById("diperbarui").innerHTML = `<span>Diperbarui: ${updateTime}</span>`;

	// Hapus loading karena data sudah muncul
	status.innerHTML = '';

	waitLoop();
}

async function waitLoop() {
	try {
		const res = await fetch(URL_APP, {
			method: "POST",
			headers: { "Content-Type": "text/plain;charset=utf-8" },
			body: JSON.stringify({ action: "waitForChange", version: currentVersion, acara: noAcara })
		});
		const data = await res.json();

		if (data.version !== currentVersion) {
			currentVersion = data.version;
			updateRender(data);
			const updateTime = new Date().toLocaleString();
			document.getElementById("diperbarui").innerHTML = `<span>Diperbarui: ${updateTime}</span>`;
		}

		waitLoop(); // loop terus
	} catch (err) {
		console.error(err);
		setTimeout(waitLoop, 5000); // kalau error, coba lagi
	}
}

// Ambil ulang jumlah hadir setiap kali data berubah
async function updateRender(res) {
	const jmlHadir = await getJmlInstHadir();
	renderInstBlmHadir(res.data, jmlHadir);
}

async function getJmlInstHadir() {
	try {
		const res = await fetch(URL_APP, {
			method: "POST",
			headers: { "Content-Type": "text/plain;charset=utf-8" },
			body: JSON.stringify({ action: "getJmlInstHadir", acara: noAcara })
		});
		const data = await res.json();
		return data.totalHadir;
	} catch (err) {
		console.error(err);
		return 0;
	}
}

async function initDashboard() {
	await initAcara();
	jmlInstansi = await getJmlInstansi();
	startRealtime();
}

async function initAcara() {
	const acara = await setAcara(noAcara);
	
	document.getElementById("namaAcara").innerHTML = acara.nama;
	document.getElementById("lokasi").innerHTML = acara.lokasi;
	document.getElementById("tanggal").innerHTML = acara.tanggal;
	document.getElementById("jam").innerHTML = acara.jam;
}

initDashboard();