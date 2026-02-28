import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ------------------------------------------------------------------
// ⚠️ SUAS CONFIGURAÇÕES DO FIREBASE
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

// ------------------------------------------------------------------
// VARIÁVEIS DA TELA
// ------------------------------------------------------------------
const passoBusca = document.getElementById("passo-busca");
const passoConfirmar = document.getElementById("passo-confirmar");
const passoSucesso = document.getElementById("rsvp-sucesso");
const inputBusca = document.getElementById("busca-nome");
const btnBuscar = document.getElementById("btn-buscar");
const msgErroBusca = document.getElementById("msg-erro-busca");

let conviteSelecionado = null; 

// ------------------------------------------------------------------
// 1. LÓGICA DE BUSCA
// ------------------------------------------------------------------
btnBuscar.addEventListener("click", async () => {
    const termo = inputBusca.value.trim().toLowerCase();
    if (!termo) {
        alert("Por favor, digite um nome para buscar.");
        return;
    }

    btnBuscar.innerText = "Buscando...";
    btnBuscar.disabled = true;
    msgErroBusca.style.display = "none";

    try {
        const querySnapshot = await getDocs(collection(db, "convidados"));
        let encontrado = null;

        // Procura se o termo digitado bate com o nome de QUALQUER membro do convite
        querySnapshot.forEach((doc) => {
            const dados = doc.data();
            
            // Verifica se a propriedade 'membros' existe antes de tentar buscar
            if (dados.membros && Array.isArray(dados.membros)) {
                const nomesMembros = dados.membros.map(m => m.nome.toLowerCase());
                
                // Se algum dos nomes incluir o que foi digitado, achamos o convite!
                if (nomesMembros.some(nome => nome.includes(termo))) {
                    encontrado = { id: doc.id, ...dados };
                }
            }
        });

        if (encontrado) {
            conviteSelecionado = encontrado;
            mostrarTelaConfirmacao();
        } else {
            msgErroBusca.style.display = "block";
        }
    } catch (error) {
        console.error("Erro ao buscar:", error);
        alert("Erro de conexão com o banco de dados. Tente novamente.");
    } finally {
        btnBuscar.innerText = "Buscar Convite";
        btnBuscar.disabled = false;
    }
});

// ------------------------------------------------------------------
// 2. LÓGICA DE EXIBIÇÃO DO CHECKLIST DE NOMES
// ------------------------------------------------------------------
function mostrarTelaConfirmacao() {
    passoBusca.classList.add("hidden");
    passoConfirmar.classList.remove("hidden");
    
    const rsvpInstrucao = document.getElementById("rsvp-instrucao");
    if(rsvpInstrucao) rsvpInstrucao.classList.add("hidden");

    // O primeiro nome da lista sempre será o Titular
    const titular = conviteSelecionado.membros[0].nome;
    document.getElementById("convite-nome").innerText = `Convite de: ${titular}`;
    
    // Gera a lista de caixinhas (checkboxes)
    const containerCheckboxes = document.getElementById("container-checkboxes");
    containerCheckboxes.innerHTML = ""; // Limpa a lista antes de preencher
    
    conviteSelecionado.membros.forEach((membro, index) => {
        // Se for o índice 0, é o titular. Os outros são acompanhantes.
        const tag = index === 0 ? 
            "<span style='color: var(--marsala); font-size: 0.8rem; margin-left: 5px;'>(Titular)</span>" : 
            "<span style='color: #888; font-size: 0.8rem; margin-left: 5px;'>(Acompanhante)</span>";
        
        containerCheckboxes.innerHTML += `
            <label style="display: flex; align-items: center; margin-bottom: 12px; cursor: pointer; font-size: 1.1rem; padding: 5px; border-bottom: 1px solid #f0f0f0;">
                <input type="checkbox" class="chk-membro" value="${index}" checked style="transform: scale(1.3); margin-right: 12px; accent-color: var(--marsala);">
                ${membro.nome} ${tag}
            </label>
        `;
    });
}

// Mostra/Esconde a lista de nomes dependendo se escolheu "Sim" ou "Não"
document.getElementById("rsvp-presenca").addEventListener("change", (e) => {
    const divListaNomes = document.getElementById("div-lista-nomes");
    if (e.target.value === "confirmado") {
        divListaNomes.classList.remove("hidden");
    } else {
        divListaNomes.classList.add("hidden");
    }
});

// Botão Voltar para a busca
document.getElementById("btn-voltar-busca").addEventListener("click", () => {
    passoConfirmar.classList.add("hidden");
    passoBusca.classList.remove("hidden");
    
    const rsvpInstrucao = document.getElementById("rsvp-instrucao");
    if(rsvpInstrucao) rsvpInstrucao.classList.remove("hidden");
    
    inputBusca.value = "";
    conviteSelecionado = null;
    document.getElementById("rsvp-presenca").value = ""; // Reseta o select
    document.getElementById("div-lista-nomes").classList.add("hidden");
});

// ------------------------------------------------------------------
// 3. LÓGICA DE SALVAR A CONFIRMAÇÃO NO FIREBASE
// ------------------------------------------------------------------
document.getElementById("btn-enviar-rsvp").addEventListener("click", async () => {
    const presenca = document.getElementById("rsvp-presenca").value;
    if (!presenca) {
        alert("Por favor, selecione se o grupo irá comparecer.");
        return;
    }

    const btnEnviar = document.getElementById("btn-enviar-rsvp");
    btnEnviar.innerText = "Salvando...";
    btnEnviar.disabled = true;

    // Atualiza o status de cada membro baseado nas caixinhas marcadas
    let membrosAtualizados = [...conviteSelecionado.membros];
    let totalConfirmados = 0;
    
    if (presenca === "confirmado") {
        const checkboxes = document.querySelectorAll('.chk-membro');
        checkboxes.forEach(chk => {
            const index = chk.value;
            const vaiComparecer = chk.checked;
            membrosAtualizados[index].confirmado = vaiComparecer;
            if (vaiComparecer) totalConfirmados++;
        });
        
        if (totalConfirmados === 0) {
            alert("Por favor, marque pelo menos uma pessoa da lista, ou mude a resposta geral para 'Não poderemos ir'.");
            btnEnviar.innerText = "Enviar Confirmação";
            btnEnviar.disabled = false;
            return;
        }
    } else {
        // Se a resposta for "Não vou", todo mundo do grupo recebe "falso" na confirmação
        membrosAtualizados = membrosAtualizados.map(m => ({ ...m, confirmado: false }));
    }

    const mensagem = document.getElementById("rsvp-mensagem").value.trim();

    try {
        await updateDoc(doc(db, "convidados", conviteSelecionado.id), {
            status_convite: presenca, // "confirmado" ou "recusado"
            membros: membrosAtualizados, // Salva a lista inteira atualizada com true/false
            mensagem_noivos: mensagem,
            data_resposta: new Date().toISOString()
        });

        passoConfirmar.classList.add("hidden");
        passoSucesso.classList.remove("hidden");
        
        const msgSucessoTexto = document.getElementById("msg-sucesso-texto");
        if (presenca === "confirmado") {
            msgSucessoTexto.innerText = `Presença confirmada para ${totalConfirmados} pessoa(s). Esperamos vocês lá!`;
        } else {
            msgSucessoTexto.innerText = "Que pena que não poderão ir. Agradecemos por avisarem!";
        }

    } catch (error) {
        console.error("Erro ao salvar no Firebase:", error);
        alert("Ops! Erro ao enviar confirmação. Tente novamente.");
        btnEnviar.innerText = "Enviar Confirmação";
        btnEnviar.disabled = false;
    }
});

// ------------------------------------------------------------------
// 4. SCRIPT PARA SEMEAR O BANCO (IMPORTAR DADOS DE TESTE)
// ------------------------------------------------------------------
window.semearConvidados = async () => {
    if (!confirm("Isso vai criar grupos de teste (como a Família do Marlos). Continuar?")) return;

    const listaConvidados = [
        {
            status_convite: "pendente",
            mensagem_noivos: "",
            membros: [
                { nome: "Marlos Avelino", confirmado: false },
                { nome: "Cleide Lopes", confirmado: false },
                { nome: "Carlos Eduardo Filho 1", confirmado: false }
            ]
        },
        {
            status_convite: "pendente",
            mensagem_noivos: "",
            membros: [
                { nome: "Kathleen", confirmado: false },
                { nome: "Pablo", confirmado: false }
            ]
        }
    ];

    try {
        for (const convite of listaConvidados) {
            await addDoc(collection(db, "convidados"), convite);
            console.log(`Convite criado para: ${convite.membros[0].nome}`);
        }
        alert("Grupos de teste adicionados! Pode pesquisar por 'Marlos' ou 'Kathleen' no site agora.");
    } catch (error) {
        console.error("Erro ao importar convidados:", error);
        alert("Erro ao semear o banco.");
    }
};

// ------------------------------------------------------------------
// 4. SCRIPT PARA SEMEAR O BANCO (SUA LISTA REAL!)
// ------------------------------------------------------------------
window.semearConvidados = async () => {
    if (!confirm("Isso vai importar sua lista REAL de convidados para o Firebase. Continuar?")) return;

    const listaConvidados = [
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Cleide", "confirmado": false}, {"nome": "Marlos", "confirmado": false}, {"nome": "Carlos", "confirmado": false}, {"nome": "Kaillayne", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Cleodete", "confirmado": false}, {"nome": "Rafael", "confirmado": false}, {"nome": "Gabriel", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Larissa", "confirmado": false}, {"nome": "Hebert", "confirmado": false}, {"nome": "Benicio", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Pamela", "confirmado": false}, {"nome": "Andre", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Bruna", "confirmado": false}, {"nome": "Marcos", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Lorhane", "confirmado": false}, {"nome": "Joao", "confirmado": false}, {"nome": "Alzira", "confirmado": false}, {"nome": "Sirlene", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Sebastiao", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Valeria", "confirmado": false}, {"nome": "Clemerson", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Herbes", "confirmado": false}, {"nome": "Marcilaine", "confirmado": false}, {"nome": "Vitor", "confirmado": false}, {"nome": "Luiza", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Luciane", "confirmado": false}, {"nome": "Luan", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Leticia", "confirmado": false}, {"nome": "Marido (Confirmar Nome)", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Gleyce", "confirmado": false}, {"nome": "Carlos", "confirmado": false}, {"nome": "Junior", "confirmado": false}, {"nome": "Kaue", "confirmado": false}, {"nome": "Ketlen", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Estevao", "confirmado": false}, {"nome": "Aldenia", "confirmado": false}, {"nome": "Pabline", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Vitoria", "confirmado": false}, {"nome": "Joao Vitor Antonio", "confirmado": false}, {"nome": "Yorrana", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Estefania", "confirmado": false}, {"nome": "Natan", "confirmado": false}, {"nome": "Estefany", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Patricia", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Igor", "confirmado": false}, {"nome": "Kevini", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Kelly", "confirmado": false}, {"nome": "Bruno", "confirmado": false}, {"nome": "Bruna", "confirmado": false}, {"nome": "Beatriz", "confirmado": false}, {"nome": "Namorado (Confirmar Nome)", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Fernando", "confirmado": false}, {"nome": "Lurdes", "confirmado": false}, {"nome": "Daniela", "confirmado": false}, {"nome": "Larissa", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Joao (Didico)", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Renata", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Maria (Pretinha)", "confirmado": false}, {"nome": "Edivam", "confirmado": false}, {"nome": "Ana Vitoria", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Joana", "confirmado": false}, {"nome": "Thaynara", "confirmado": false}, {"nome": "Namorado (Confirmar Nome)", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Gabriel Razuk", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Arthur", "confirmado": false}, {"nome": "Thais", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Karolaine", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Daniel", "confirmado": false}, {"nome": "Namorada (Confirmar Nome)", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Werlis", "confirmado": false}, {"nome": "Cassia", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Marcia", "confirmado": false}, {"nome": "Samir", "confirmado": false}, {"nome": "Ana Cecilia", "confirmado": false}, {"nome": "Izaura", "confirmado": false}, {"nome": "Julieta", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Rubineia", "confirmado": false}, {"nome": "Emanuelly", "confirmado": false}, {"nome": "Kauan", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Wesley", "confirmado": false}, {"nome": "Indiara", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Wender", "confirmado": false}, {"nome": "Tatiane", "confirmado": false}, {"nome": "Lauane", "confirmado": false}, {"nome": "Isac", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Luciana", "confirmado": false}, {"nome": "Delvani", "confirmado": false}, {"nome": "Deivid", "confirmado": false}, {"nome": "Luize", "confirmado": false}, {"nome": "Daniel", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Erondina", "confirmado": false}, {"nome": "Raimundo", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Cinezia", "confirmado": false}, {"nome": "Davino", "confirmado": false}, {"nome": "Gleydison", "confirmado": false}, {"nome": "Kairo", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Luciano", "confirmado": false}, {"nome": "Ene", "confirmado": false}, {"nome": "Natalia", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Sheila", "confirmado": false}, {"nome": "Adriano", "confirmado": false}, {"nome": "Geovana", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Fernanda", "confirmado": false}, {"nome": "Felipe", "confirmado": false}, {"nome": "Ravi", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Maria Gabriela", "confirmado": false}, {"nome": "Edivani", "confirmado": false}, {"nome": "Elias", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Natalia", "confirmado": false}, {"nome": "Davi", "confirmado": false}, {"nome": "Guilherme", "confirmado": false}, {"nome": "Julia", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Nalva", "confirmado": false}, {"nome": "Everaldo", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Edivaldo", "confirmado": false}, {"nome": "Darci", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Kely Cristina", "confirmado": false}, {"nome": "Marco Aurelio", "confirmado": false}, {"nome": "Gustavo", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Yasmim", "confirmado": false}, {"nome": "Vitor", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Suiane", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Camile", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Thalysson", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Thais", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Gabrielle", "confirmado": false}, {"nome": "Diego", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Paulo", "confirmado": false}, {"nome": "Mulher do Paulo", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Paulo Henrique", "confirmado": false}, {"nome": "Confirmar Acompanhante", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Renata Camargo", "confirmado": false}, {"nome": "Pablo", "confirmado": false}, {"nome": "Valentina", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Irmã Maria", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Juliana", "confirmado": false}, {"nome": "Marido (Confirmar Nome)", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Sueli", "confirmado": false}, {"nome": "Vanderlei", "confirmado": false}, {"nome": "Hemily", "confirmado": false}, {"nome": "Gabriel", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Paola", "confirmado": false}, {"nome": "Gabriel", "confirmado": false}, {"nome": "Miguel Bebe", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Suzy", "confirmado": false}, {"nome": "Andre", "confirmado": false}, {"nome": "Ana Julia", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Lubia", "confirmado": false}, {"nome": "Geovane", "confirmado": false}, {"nome": "Gabriel", "confirmado": false}, {"nome": "Grazyeli", "confirmado": false}, {"nome": "Mirian", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Zeni (Confirmar Nome)", "confirmado": false}, {"nome": "Rosana", "confirmado": false}, {"nome": "Filho (Confirmar Nome)", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Weder", "confirmado": false}, {"nome": "Juliana", "confirmado": false}, {"nome": "Yasmis", "confirmado": false}, {"nome": "Vitoria", "confirmado": false}, {"nome": "Rafeala", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Cristina", "confirmado": false}, {"nome": "Alessandro", "confirmado": false}, {"nome": "Joao Vitor", "confirmado": false}, {"nome": "Guilherme Custodio", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Asteria", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Simone", "confirmado": false}, {"nome": "Cassio", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Matilda", "confirmado": false}, {"nome": "Marco Junio", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Angelo", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Dayvan", "confirmado": false}, {"nome": "Mulher Dayvan", "confirmado": false}, {"nome": "Davi Dayvan", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Wharley", "confirmado": false}, {"nome": "Mulher do Wharley", "confirmado": false}, {"nome": "Filha 1", "confirmado": false}, {"nome": "Filha 2", "confirmado": false}, {"nome": "Filha 3", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Junior Santos", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Jose", "confirmado": false}, {"nome": "Celia", "confirmado": false}, {"nome": "Vivian", "confirmado": false}, {"nome": "Jonatan", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Missionario", "confirmado": false}, {"nome": "Missionaria", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Giselma", "confirmado": false}, {"nome": "Cleber", "confirmado": false}, {"nome": "Miguel", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Fernando", "confirmado": false}, {"nome": "Juliana", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Iris", "confirmado": false}, {"nome": "Joao Reis", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Guti", "confirmado": false}, {"nome": "Natalino", "confirmado": false}, {"nome": "Natiely", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Flavio", "confirmado": false}, {"nome": "Jordana", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Brenda", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Lessandro", "confirmado": false}, {"nome": "Mulher do Lessandro", "confirmado": false}, {"nome": "Filha Lessandro", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Bruno", "confirmado": false}, {"nome": "Karen", "confirmado": false}, {"nome": "Sofia", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Leticia", "confirmado": false}, {"nome": "Ronaldo", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Felipe", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Evillen", "confirmado": false}, {"nome": "Maicon", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Larissa", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Silvia Gabriely Matos", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Thaiany", "confirmado": false}, {"nome": "Alex", "confirmado": false}, {"nome": "Kaleb", "confirmado": false}, {"nome": "Rebeca", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Mãe Eloa", "confirmado": false}, {"nome": "Eloa", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Ilma", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Jailton", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Gabriele Arcanjo", "confirmado": false}]},
        {"status_convite": "pendente", "mensagem_noivos": "", "membros": [{"nome": "Jose Lopes", "confirmado": false}, {"nome": "Rosenda", "confirmado": false}]}
    ];

    try {
        let contador = 0;
        for (const convite of listaConvidados) {
            await addDoc(collection(db, "convidados"), convite);
            contador++;
            console.log(`Convite ${contador} criado para: ${convite.membros[0].nome}`);
        }
        alert(`Sucesso! ${contador} famílias foram adicionadas ao Firebase. Já pode pesquisar por qualquer um deles!`);
    } catch (error) {
        console.error("Erro ao importar convidados:", error);
        alert("Erro ao semear o banco.");
    }
};