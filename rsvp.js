import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ------------------------------------------------------------------
// ⚠️ CONFIGURAÇÕES ATUALIZADAS (Evelin e Maycon)
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBSCwxHXHrj0vB_NZRhzsnROSKNei5TCOc",
  authDomain: "casamento-evelin-e-maycon.firebaseapp.com",
  projectId: "casamento-evelin-e-maycon",
  storageBucket: "casamento-evelin-e-maycon.firebasestorage.app",
  messagingSenderId: "993871981240",
  appId: "1:993871981240:web:12353cd22f7125b350224d",
  measurementId: "G-ZVTFWRZB8N"
};

// Inicialização
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

        querySnapshot.forEach((doc) => {
            const dados = doc.data();
            if (dados.membros && Array.isArray(dados.membros)) {
                const nomesMembros = dados.membros
                    .filter(m => m && typeof m.nome === 'string')
                    .map(m => m.nome.toLowerCase());
                
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
        alert("Erro de conexão com o banco de dados.");
    } finally {
        btnBuscar.innerText = "Buscar Convite";
        btnBuscar.disabled = false;
    }
});

// ------------------------------------------------------------------
// 2. LÓGICA DE EXIBIÇÃO
// ------------------------------------------------------------------
function mostrarTelaConfirmacao() {
    passoBusca.classList.add("hidden");
    passoConfirmar.classList.remove("hidden");
    
    const rsvpInstrucao = document.getElementById("rsvp-instrucao");
    if(rsvpInstrucao) rsvpInstrucao.classList.add("hidden");

    const titular = conviteSelecionado.membros[0].nome;
    document.getElementById("convite-nome").innerText = `Convite de: ${titular}`;
    
    const containerCheckboxes = document.getElementById("container-checkboxes");
    containerCheckboxes.innerHTML = ""; 
    
    conviteSelecionado.membros.forEach((membro, index) => {
        const tag = index === 0 ? 
            "<span style='color: #821c2c; font-size: 0.8rem; margin-left: 5px;'>(Titular)</span>" : 
            "<span style='color: #888; font-size: 0.8rem; margin-left: 5px;'>(Acompanhante)</span>";
        
        containerCheckboxes.innerHTML += `
            <label style="display: flex; align-items: center; margin-bottom: 12px; cursor: pointer; font-size: 1.1rem; padding: 5px; border-bottom: 1px solid #f0f0f0;">
                <input type="checkbox" class="chk-membro" value="${index}" checked style="transform: scale(1.3); margin-right: 12px; accent-color: #821c2c;">
                ${membro.nome} ${tag}
            </label>
        `;
    });
}

// Voltar para busca
document.getElementById("btn-voltar-busca").addEventListener("click", () => {
    passoConfirmar.classList.add("hidden");
    passoBusca.classList.remove("hidden");
    inputBusca.value = "";
    conviteSelecionado = null;
});

// ------------------------------------------------------------------
// 3. SALVAR NO FIREBASE
// ------------------------------------------------------------------
async function salvarPresencaFirebase(vaiComparecerGrupo) {
    const btnEnviar = document.getElementById("btn-enviar-rsvp");
    btnEnviar.innerText = "Salvando...";
    btnEnviar.disabled = true;

    let membrosAtualizados = [...conviteSelecionado.membros];
    let totalConfirmados = 0;
    
    if (vaiComparecerGrupo) {
        const checkboxes = document.querySelectorAll('.chk-membro');
        checkboxes.forEach(chk => {
            const index = chk.value;
            const vaiComparecer = chk.checked;
            membrosAtualizados[index].confirmado = vaiComparecer;
            if (vaiComparecer) totalConfirmados++;
        });
        
        if (totalConfirmados === 0) {
            alert("Marque pelo menos uma pessoa ou clique em 'Ninguém poderá ir'.");
            btnEnviar.innerText = "Confirmar Presença";
            btnEnviar.disabled = false;
            return;
        }
    } else {
        membrosAtualizados = membrosAtualizados.map(m => ({ ...m, confirmado: false }));
    }

    const statusFinal = vaiComparecerGrupo ? "confirmado" : "recusado";
    const mensagem = document.getElementById("rsvp-mensagem").value.trim();

    try {
        await updateDoc(doc(db, "convidados", conviteSelecionado.id), {
            status_convite: statusFinal,
            membros: membrosAtualizados,
            mensagem_noivos: mensagem,
            data_resposta: new Date().toISOString()
        });

        passoConfirmar.classList.add("hidden");
        passoSucesso.classList.remove("hidden");
        
        const msgSucessoTexto = document.getElementById("msg-sucesso-texto");
        msgSucessoTexto.innerText = statusFinal === "confirmado" 
            ? `Presença confirmada para ${totalConfirmados} pessoa(s).` 
            : "Agradecemos por avisar!";

    } catch (error) {
        console.error("Erro:", error);
        alert("Erro ao enviar. Tente novamente.");
        btnEnviar.disabled = false;
    }
}

document.getElementById("btn-enviar-rsvp").addEventListener("click", () => salvarPresencaFirebase(true));
document.getElementById("btn-recusar-rsvp")?.addEventListener("click", () => {
    if(confirm("Confirmar que ninguém do grupo poderá ir?")) salvarPresencaFirebase(false);
});

// ------------------------------------------------------------------
// 4. SEMEAR BANCO (EXECUTAR NO CONSOLE)
// ------------------------------------------------------------------
window.semearConvidados = async () => {
    if (!confirm("Isso vai importar os 25 convites da nova planilha para o Firebase. Continuar?")) return;

    const listaNova = [
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Evandro Sousa", "confirmado": false}, {"nome": "Sônia Almeida", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Elias Gabriel", "confirmado": false}, {"nome": "Thaylany", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Giovanna Graziani", "confirmado": false}, {"nome": "Gabryel Tomaz", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Isadora Cristina", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Kauanny Alves", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Emilly Vitoria", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Alice Berlamino", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Gabrielly Ramos", "confirmado": false}, {"nome": "Diego Martins", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Katheleen Santos", "confirmado": false}, {"nome": "Pablo Lopes", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Letícia Ferreira", "confirmado": false}, {"nome": "Ronaldo", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Filipe Pereira", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Larrisa Lopes", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Thaiany Mota", "confirmado": false}, {"nome": "Alex Mota", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Gisele Almeida", "confirmado": false}, {"nome": "Lucas Eduardo", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Geyza Almeida", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Thiago Almeida", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Rosa Nascimento", "confirmado": false}, {"nome": "Nonato", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Conceição Sousa", "confirmado": false}, {"nome": "Francisco Sousa", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Maria Edite", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Ana Paula Oliveira", "confirmado": false}, {"nome": "Cléber Júnior", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Carlos", "confirmado": false}, {"nome": "Letícia", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Nubia", "confirmado": false}, {"nome": "Bruno", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Janete Cristina", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Leuzileide Costa", "confirmado": false}]
    },
    {
        "status_convite": "pendente",
        "mensagem_noivos": "",
        "membros": [{"nome": "Israel Almeida", "confirmado": false}, {"nome": "Rayssa Lorena", "confirmado": false}]
    }
];

    try {
        let count = 0;
        for (const c of listaNova) {
            await addDoc(collection(db, "convidados"), c);
            count++;
        }
        alert(count + " convites importados com sucesso!");
    } catch (e) {
        console.error("Erro ao importar:", e);
    }
};