import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ------------------------------------------------------------------
// SUAS CONFIGURAÇÕES (Mantive as que você mandou)
// ------------------------------------------------------------------
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

// --- VARIÁVEIS GLOBAIS ---
const listaElement = document.getElementById('lista-presentes');
let itemSelecionadoId = null;
let categoriaAtual = 'todos'; 

// Elementos do Modal (Novos para a animação)
const modal = document.getElementById('modal');
const passoForm = document.getElementById('passo-formulario'); // Certifique-se de ter atualizado o HTML
const passoSucesso = document.getElementById('passo-sucesso'); // Certifique-se de ter atualizado o HTML
const inputNome = document.getElementById('nome-convidado');
const nomeItemModal = document.getElementById('nome-item-modal');

// Verifica Admin
const urlParams = new URLSearchParams(window.location.search);
const souAdmin = urlParams.get('admin') === 'pablo';

if (souAdmin) { 
    const footerP = document.querySelector('footer p');
    if(footerP) footerP.innerHTML += ' | 🔓 Modo Admin Ativo'; 
}

// --- 1. CARREGAR E EXIBIR LISTA ---
function carregarLista() {
    const q = query(collection(db, "presentes"), orderBy("nome"));

    onSnapshot(q, (snapshot) => {
        listaElement.innerHTML = ''; 
        if (snapshot.empty) { listaElement.innerHTML = '<div class="loading">Nenhum presente encontrado.</div>'; return; }

        snapshot.forEach((doc) => {
            const item = doc.data();
            const id = doc.id;
            const estaReservado = item.status === 'reservado';

            // Filtro de Categoria
            if (categoriaAtual !== 'todos' && !item.categoria.toLowerCase().includes(categoriaAtual.toLowerCase())) { return; }

            let botaoHtml = '';
            let classeReservado = estaReservado ? 'reservado' : '';

            // Lógica do Botão
            if (estaReservado) {
                if (souAdmin) {
                    botaoHtml = `<div style="background:#fff3cd; color:#856404; padding:10px; font-size:0.8rem; margin-top:auto;">🎁 Dado por: <strong>${item.reservado_por}</strong></div>`;
                } else {
                    botaoHtml = `<button class="btn-presentear" disabled style="background-color:#ccc; cursor:default;">Já Escolhido ❤️</button>`;
                }
            } else {
                botaoHtml = `<button class="btn-presentear" onclick="abrirModal('${id}', '${item.nome}')">Presentear 🎁</button>`;
            }

            // Cria o Card
            const card = document.createElement('div');
            card.className = `card ${classeReservado}`;
            
            // Tenta carregar a imagem local, se falhar, põe um placeholder
            card.innerHTML = `
                <img src="${item.imagem}" alt="${item.nome}" class="card-img" loading="lazy" onerror="this.src='https://placehold.co/600x400?text=Foto+Indisponível'">
                <div class="card-content">
                    <span class="tag">${item.categoria}</span>
                    <h3>${item.nome}</h3>
                    ${botaoHtml}
                </div>
            `;
            listaElement.appendChild(card);
        });
    });
}

// --- 2. FILTROS ---
window.filtrar = (categoria) => {
    categoriaAtual = categoria;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    // Pequena proteção caso o evento não seja passado diretamente
    if(event) event.target.classList.add('active');
    carregarLista();
};

// --- 3. MODAL (LÓGICA NOVA COM ANIMAÇÃO) ---

// Abre o modal RESETANDO para o formulário inicial
window.abrirModal = (id, nomeItem) => {
    itemSelecionadoId = id;
    nomeItemModal.innerText = nomeItem;
    
    // Garante que o formulário apareça e o sucesso esteja escondido
    if(passoForm) passoForm.classList.remove('hidden');
    if(passoSucesso) passoSucesso.classList.add('hidden');
    
    inputNome.value = ''; 
    modal.classList.remove('hidden');
    inputNome.focus();
};

// Fecha o modal
window.fecharModal = () => {
    modal.classList.add('hidden');
    itemSelecionadoId = null;
};

// Botão Cancelar (X) - Verifica se o elemento existe antes de adicionar evento
const btnCancelar = document.getElementById('btn-cancelar');
if(btnCancelar) btnCancelar.addEventListener('click', window.fecharModal);

// Botão Confirmar (Salva e mostra Sucesso)
const btnConfirmar = document.getElementById('btn-confirmar');
if(btnConfirmar) {
    btnConfirmar.addEventListener('click', async () => {
        const nome = inputNome.value.trim();

        if (!nome) {
            alert("Por favor, digite seu nome para sabermos quem é! 😊");
            return;
        }

        btnConfirmar.innerText = "Salvando...";
        btnConfirmar.disabled = true;

        try {
            // Atualiza no Firebase
            await updateDoc(doc(db, "presentes", itemSelecionadoId), {
                status: 'reservado',
                reservado_por: nome,
                data_reserva: new Date().toISOString()
            });

            // ✨ A MÁGICA: Esconde formulário -> Mostra Sucesso
            if(passoForm && passoSucesso) {
                passoForm.classList.add('hidden');
                passoSucesso.classList.remove('hidden');
            } else {
                // Fallback caso o HTML não tenha sido atualizado
                alert("Obrigado! Sua reserva foi confirmada.");
                window.fecharModal();
            }

        } catch (error) {
            console.error("Erro:", error);
            alert("Ops! Erro ao reservar. Tente de novo.");
        } finally {
            btnConfirmar.innerText = "CONFIRMAR PRESENTE 🎁";
            btnConfirmar.disabled = false;
        }
    });
}

// --- 4. SEMEAR BANCO COM SUAS IMAGENS LOCAIS ---
window.semearBanco = async () => {
    if (!confirm("Isso vai apagar a lista atual e cadastrar tudo de novo. Confirma?")) return;

    // Sua lista com caminhos locais
    const listaComFotos = [
        // --- SALA ---
        { nome: "Televisão", categoria: "SALA", status: "livre", imagem: "Imagens/Sala/Tv.jpg" },
        { nome: "Sofá", categoria: "SALA", status: "livre", imagem: "Imagens/Sala/Sofa.jpg" },
        { nome: "Cortinas", categoria: "SALA", status: "livre", imagem: "Imagens/Sala/Cortina.jpg" },
        { nome: "Carpete/Tapete", categoria: "SALA", status: "livre", imagem: "Imagens/Sala/CarpeteSala.jpg" },
        { nome: "Almofadas Decorativas", categoria: "SALA", status: "livre", imagem: "Imagens/Sala/Almofadas.jpg" },
        { nome: "Manta para Sofá", categoria: "SALA", status: "livre", imagem: "Imagens/Sala/MantaSofa.jpg" },

        // --- QUARTO ---
        { nome: "Jogo de Cama", categoria: "QUARTO", status: "livre", imagem: "Imagens/Quarto/JogoCama.jpg" },
        { nome: "Cobertor ou Manta", categoria: "QUARTO", status: "livre", imagem: "Imagens/Quarto/Cobertor.jpg" },
        { nome: "Ferro de Passar", categoria: "QUARTO", status: "livre", imagem: "Imagens/Quarto/Ferro.jpg" }, 

        // --- COZINHA ---
        { nome: "Microondas", categoria: "COZINHA", status: "livre", imagem: "Imagens/Cozinha/Microondas.jpg" },
        { nome: "Forno Elétrico", categoria: "COZINHA", status: "livre", imagem: "Imagens/Cozinha/FornoEletrico.jpg" },
        { nome: "Processador de Alimentos", categoria: "COZINHA", status: "livre", imagem: "Imagens/Cozinha/Processador.jpg" },
        { nome: "Liquidificador", categoria: "COZINHA", status: "livre", imagem: "Imagens/Cozinha/Liquidificador.jpg" },
        { nome: "Jogo de Panelas", categoria: "COZINHA", status: "livre", imagem: "Imagens/Cozinha/Panelas.jpg" },
        { nome: "Tábuas de Corte", categoria: "COZINHA", status: "livre", imagem: "Imagens/Cozinha/Tabuas.jpg" },
        { nome: "Batedeira", categoria: "COZINHA", status: "livre", imagem: "Imagens/Cozinha/Batedeira.jpg" },
        { nome: "Jogo de Pratos", categoria: "COZINHA", status: "livre", imagem: "Imagens/Cozinha/Pratos.jpg" },
        { nome: "Kit de Facas", categoria: "COZINHA", status: "livre", imagem: "Imagens/Cozinha/Facas.jpg" },
        { nome: "Jogo de Copos", categoria: "COZINHA", status: "livre", imagem: "Imagens/Cozinha/JogoCopos.jpg" },
        { nome: "Jogo de Taças", categoria: "COZINHA", status: "livre", imagem: "Imagens/Cozinha/JogoTacas.jpg" },
        { nome: "Jogo de Talheres", categoria: "COZINHA", status: "livre", imagem: "Imagens/Cozinha/JogoTalher.jpg" },
        { nome: "Potes Herméticos", categoria: "COZINHA", status: "livre", imagem: "Imagens/Cozinha/PotesHermeticos.jpg" },
        { nome: "Escorredor de Louças", categoria: "COZINHA", status: "livre", imagem: "Imagens/Cozinha/Escorredor.jpg" },
        { nome: "Garrafa de Café", categoria: "COZINHA", status: "livre", imagem: "Imagens/Cozinha/GarrafaCafe.jpg" },
        { nome: "Panos de Prato", categoria: "COZINHA", status: "livre", imagem: "Imagens/Cozinha/Panos.jpg" },
        { nome: "Kit Utensílios Silicone", categoria: "COZINHA", status: "livre", imagem: "Imagens/Cozinha/KitUtensilios.jpg" },
        { nome: "Ralador e Peneiras", categoria: "COZINHA", status: "livre", imagem: "Imagens/Cozinha/Ralador.jpg" },
        { nome: "Formas de Bolo", categoria: "COZINHA", status: "livre", imagem: "Imagens/Cozinha/Formas.jpg" },
        { nome: "Travessas de Vidro", categoria: "COZINHA", status: "livre", imagem: "Imagens/Cozinha/Travessas.jpg" },

        // --- BANHEIRO ---
        { nome: "Cesto de Roupa e Lixeira", categoria: "BANHEIRO", status: "livre", imagem: "Imagens/Banheiro/Cesto.jpg" },
        { nome: "Jogo de Tapetes", categoria: "BANHEIRO", status: "livre", imagem: "Imagens/Banheiro/Jogo de Tapetes.jpg" },
        { nome: "Kit Sobre a Pia", categoria: "BANHEIRO", status: "livre", imagem: "Imagens/Banheiro/Porta SaboneteEscova.jpg" },
        { nome: "Escova Sanitária", categoria: "BANHEIRO", status: "livre", imagem: "Imagens/Banheiro/EscovaSanitaria.jpg" },
        { nome: "Toalhas de Rosto", categoria: "BANHEIRO", status: "livre", imagem: "Imagens/Banheiro/ToalhaRosto.jpg" },

        // --- ÁREA DE SERVIÇO ---
        { nome: "Baldes e Bacias", categoria: "ÁREA SERV.", status: "livre", imagem: "Imagens/AreaServ/BaldesBacias.jpg" },
        { nome: "Tanquinho", categoria: "ÁREA SERV.", status: "livre", imagem: "Imagens/AreaServ/Tanquinho.jpg" },
        { nome: "Tábua de Passar", categoria: "ÁREA SERV.", status: "livre", imagem: "Imagens/AreaServ/Tabua.jpg" }
    ];

    let contador = 0;
    // Cadastra um por um
    for (const item of listaComFotos) {
        await addDoc(collection(db, "presentes"), item);
        contador++;
        console.log(`Enviado: ${item.nome}`);
    }
    alert(`Sucesso! ${contador} itens cadastrados com imagens locais.`);
};

// Inicia o app
carregarLista();