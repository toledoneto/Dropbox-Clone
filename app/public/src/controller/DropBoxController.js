class DropBoxController
{

    constructor()
    {

        // evento de clique no botão enviar
        this.btnSendFileEl = document.querySelector('#btn-send-file');

        // janela de input de arqv
        this.inputFiles = document.querySelector('#files');

        // modal da barra de progresso do upload do arqv
        this.snackModalEl = document.querySelector('#react-snackbar-root');
        
        // inicia os eventos
        this.initEvents();

    }

    initEvents()
    {

        this.btnSendFileEl.addEventListener('click', event => {

            // 'força' o click no botão para abrir janela de abrir arqvs
            this.inputFiles.click();

        });

        this.inputFiles.addEventListener('change', event => {

            // método para poder carregar mais de um arqv ao msm tempo.
            // target é o janela de inputFiles, o evento é a mudança dessa janela e o files são os arqvs enviados
            this.uploadTask(event.target.files);

            // coloca o modal de barra de carregamento
            this.snackModalEl.style.display = 'block';

        });

    }

    uploadTask(files)
    {

        // cada arqv vai ter a sua promessa, em caso de envio de mais de um arqv, por isso o array de promessas
        let promises = [];

        // para cada file enviado...
        [...files].forEach(file => {

            // ...add uma nova promessa DAQUELE arqv no array de promessas
            promises.push(new Promise((resolve, reject) => {

                // cria uma conexão AJAX...
                let ajax = new XMLHttpRequest();

                // ...e envia via POST
                ajax.open('POST', '/upload');

                // verificando a situação do envio
                ajax.onload = event => {

                    try
                    {
                        // caso haja sucesso no envio
                        resolve(JSON.parse(ajax.responseText));

                    } catch (err) {

                        reject(err);

                    }
                };

                ajax.onerror = event => {
                    reject(event);
                };

                // criando um formData para envio do arqv
                let formData = new FormData();

                // (nome do aqrv no server, arqv para ser enviado)
                formData.append('input-file', file);

                // enviando via ajax
                ajax.send(formData);

            }));
        });

        // Promise.all trata várias promessas ao msm tempo
        return Promise.all(promises);

    }

}