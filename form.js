// -- Tampil Peta --
const status = document.getElementById("status");
const form = document.getElementById("form-daftar-hadir");
const URL_APP = 'https://script.google.com/macros/s/AKfycbxCRYG03KUFyjTtfklk39f24HtfefWdmKGMgxGI9nVE1CfPH7eKB7F8l9tVCWHobUin/exec';

let noAcara, usrLat, usrLng;

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

async function setInstansi() {
	status.innerHTML = `<div class="loading"><div class="loading-icon"></div><div>Mengambil daftar Instansi/OPD...</div></div>`;

	try {
		 const res = await fetch(URL_APP, {
 		 	method: 'POST',
 		 	headers: {
  				'Content-Type': 'text/plain;charset=utf-8'
  			},
  			body: JSON.stringify({ 
				action: 'getInstansi',
				acara: noAcara
			})
		});

		const data = await res.json();
 		return data;
	} catch (err) {
		console.error('Error getInstansi:', err);
	}
}

// Inisiasi map
function initMap(acara) {
	status.innerHTML = `<div class="loading"><div class="loading-icon"></div><div>Inisiasi map...</div></div>`;
	
	const acrLatLng = [acara.latitude, acara.longitude];
	const radius = acara.radius;
	
	// 19 = bangunan, 15 = kota, 0 = seluruh dunia.
	const zoom = 17;
	
	const  map = L.map('map').setView(acrLatLng, zoom);

	// Layer dari OpenStreetMap
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' 
	}).addTo(map);
	
	// Tambahkan marker lokasi acara
	const marker = L.marker(acrLatLng).addTo(map)
		.bindPopup('<b>Lokasi Acara</b>')
		.openPopup();
	
	L.circle(acrLatLng, {
		radius: radius,
		color: 'blue',
		fillColor: '#3f9df5',
		fillOpacity: 0.2
	}).addTo(map)
	.bindPopup(`Radius ${radius} meter`);
	
	// Deteksi lokasi pengguna
	map.locate({
		setView: true,
		maxZoom: 17,
		enableHighAccuracy: true
	});
	
	// Custom user pin
	const userPin = L.divIcon({
		html: '<i class="fa-solid fa-location-dot user-pin"></i>',
		iconSize: [32, 32],
		className: 'user-marker'
	});
	
	// Jika lokasi tidak ditemukan
	map.on('locationerror', onLocationNotFound);
	
	function onLocationNotFound(e) {
		status.innerHTML = `<div class="warning">Gagal mendeteksi lokasi: ${e.message}</div>`;
	
		throw new Error("Proses dihentikan karena gagal deteksi lokasi!");
	}
	
	// Daftarkan event listener
	map.on('locationfound', onLocationFound); 
	
	function onLocationFound(e) {
		usrLatLng = e.latlng;
		usrLat = e.latlng.lat;
		usrLng = e.latlng.lng;
	
		// Marker posisi pengguna
		L.marker(usrLatLng, { icon:userPin })
			.addTo(map)
			.bindPopup('Lokasi anda')
			.openPopup();
		
		// Cek jarak		
		status.innerHTML = `<div class="loading"><div class="loading-icon"></div><div>Menghitung jarak...</div></div>`;

		const jarak = map.distance(usrLatLng, acrLatLng);
		
		if (jarak > radius) {
			status.innerHTML = `<div class="warning">Anda berada diluar area!</div>`;
			return;
		} else {
			tampilForm().catch(console.error);
		}
	}
}

// Tampil form
async function tampilForm() {
	form.style.display = 'flex';
	status.innerHTML = '';
	
	// Pilihan Instansi/OPD
	const instansi = await setInstansi();
	const listDiv = document.getElementById("instansiList");
	listDiv.innerHTML = ""; // kosongkan dulu

	Object.keys(instansi).forEach((kategori) => {
		const list = instansi[kategori];
	
		// Skip kosong
		if (!Array.isArray(list) || list.length === 0) return;
	
		// Tambah item per baris
		list.forEach((row) => {
			const item = document.createElement("div");
			
			item.className = "dropdown-item";
			item.textContent = row;
			listDiv.appendChild(item);
		})
	});

	status.innerHTML = "";
}

function toggleDropdown(event) {
	if (event) event.preventDefault();

	const dropdown = document.getElementById("dropdownInstansi");
	const icon = document.getElementById("dropdownIcon");

	dropdown.classList.toggle("show");

	if (dropdown.classList.contains("show")) {
		icon.classList.replace("fa-caret-down", "fa-caret-up");
	} else {
		icon.classList.replace("fa-caret-up", "fa-caret-down");
	}

	document.getElementById("inputInstansi").focus();
}

function filterInstansi() {
	const input = document.getElementById("inputInstansi");
	const filter = input.value.toUpperCase();
	const items = document.getElementsByClassName("dropdown-item");

	for (let i = 0; i < items.length; i++) {
		const txtValue = items[i].textContent || items[i].innerText;
		items[i].style.display = txtValue.toUpperCase().indexOf(filter) > -1 ? "" : "none";
	}
}

function pilihInstansi(namaInstansi) {
	const instansiButton = document.getElementById("instansiButton");
	const instansiHidden = document.getElementById("instansiHidden");
	const dropdown = document.getElementById("dropdownInstansi");
	const icon = document.getElementById("dropdownIcon");
	
	// Ganti teks tapi pertahankan ikon
	instansiButton.innerHTML = `${namaInstansi} <i id="dropdownIcon" class="fa-solid fa-caret-down"></i>`;
	instansiHidden.value = namaInstansi;
	
	if (dropdown && icon) {
		dropdown.classList.remove("show");
		icon.classList.replace("fa-caret-up", "fa-caret-down");
	}
}

async function initAcara() {
	const params = new URLSearchParams(window.location.search);
	noAcara = params.get('acara');
	
	const acara = await setAcara(noAcara);
	
	document.getElementById("namaAcara").innerHTML = acara.nama;
	document.getElementById("lokasi").innerHTML = acara.lokasi;
	document.getElementById("tanggal").innerHTML = acara.tanggal;
	document.getElementById("jam").innerHTML = acara.jam;

	initMap(acara);
}

initAcara();

document.addEventListener("click", function (e) {
	// Jika klik di luar dropdown, tutup dropdown
	if (!e.target.closest(".dropdown")) {
		const dropdown = document.getElementById("dropdownInstansi");
		const icon = document.getElementById("dropdownIcon");
		if (dropdown && icon) {
			dropdown.classList.remove("show");
			icon.classList.replace("fa-caret-up", "fa-caret-down");
		}
	}
	
	// Jika klik pada item instansi
	if (e.target.classList.contains("dropdown-item")) {
		pilihInstansi(e.target.textContent);
	}
});

// Submit
form.addEventListener("submit", async function(e) {
	e.preventDefault();

	const data = {
		noAcara: noAcara,
		nama: form.nama.value,
		instansi: form.instansi.value,
		jabatan: form.jabatan.value,
		lat: usrLat,
		lng: usrLng
	};

	status.innerHTML = `<div class="loading"><div class="loading-icon"></div><div>Menyimpan Data Presensi...</div></div>`;

	try {
		const res = await fetch(URL_APP, {
			method: "POST",
			headers: { "Content-Type": "text/plain;charset=utf-8" },
			body: JSON.stringify({
				action: "simpanPresensi",
				data: data
			})
		});
	
		const result = await res.json();
	
		if (result.status === "success") {
			status.innerHTML = `<div class="success">Presensi Berhasil disimpan!</div>`;
			form.reset();
		} else {
			status.innerHTML = `<div class="warning">${result.message}</div>`;
		}
	} catch (err) {
		console.error(err);
		status.innerHTML = `<div class="warning">Gagal menyimpan data: ${err.message}</div>`;
	}
});
