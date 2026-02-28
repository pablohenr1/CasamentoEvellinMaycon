import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// SUAS CHAVES DO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyClI9Lg4IXjHtwZetZxgKdv55sSF-jRSg8",
    authDomain: "casamento-kathleenpablo.firebaseapp.com",
    projectId: "casamento-kathleenpablo",
    storageBucket: "casamento-kathleenpablo.firebasestorage.app",
    messagingSenderId: "82624101006",
    appId: "1:82624101006:web:7a19f6917d697cbeeea7df",
    measurementId: "G-TNSD3ZBS2C"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 1. LÓGICA DA CONTAGEM REGRESSIVA ---
const dataCasamento = new Date("September 19, 2026 16:00:00").getTime();

setInterval(() => {
    const agora = new Date().getTime();
    const distancia = dataCasamento - agora;

    const dias = Math.floor(distancia / (1000 * 60 * 60 * 24));
    const horas = Math.floor((distancia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60));

    // Proteção caso os elementos não existam na página
    if(document.getElementById("dias")) {
        document.getElementById("dias").innerText = dias < 10 ? "0" + dias : dias;
        document.getElementById("horas").innerText = horas < 10 ? "0" + horas : horas;
        document.getElementById("minutos").innerText = minutos < 10 ? "0" + minutos : minutos;
    }
}, 1000);

// --- 2. LÓGICA DO CARROSSEL ---
let slideIndex = 0;
const slides = document.querySelectorAll(".carousel-slide");

// Só executa se estiver na página que tem o carrossel
if(slides.length > 0) {
    function mostrarSlide(n) {
        if (n >= slides.length) { slideIndex = 0; }
        if (n < 0) { slideIndex = slides.length - 1; }
        
        slides.forEach(slide => slide.classList.remove("active"));
        slides[slideIndex].classList.add("active");
    }

    // Botões manuais
    document.getElementById("btn-prev").addEventListener("click", () => {
        slideIndex--;
        mostrarSlide(slideIndex);
    });

    document.getElementById("btn-next").addEventListener("click", () => {
        slideIndex++;
        mostrarSlide(slideIndex);
    });

    // Rotação automática a cada 5 segundos
    setInterval(() => {
        slideIndex++;
        mostrarSlide(slideIndex);
    }, 9000);
}