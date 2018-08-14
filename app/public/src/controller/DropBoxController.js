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
        this.progressBarEl = this.snackModalEl.querySelector('.mc-progress-bar-fg');
        // nome na barra modal
        this.filenameEl = this.snackModalEl.querySelector('.filename');
        // tempo restante na barra modal
        this.timeleftEl = this.snackModalEl.querySelector('.timeleft');
        
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
            this.modalShow();

            // zerando o campo de envio para ser possível enviar outros arqvs
            this.inputFiles.value = '';

        });

    }

    modalShow(show = true)
    {

        this.snackModalEl.style.display = (show) ? 'block' : 'none';

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

                    // esconde o modal de arqv carregado
                    this.modalShow(false);

                    try
                    {
                        // caso haja sucesso no envio
                        resolve(JSON.parse(ajax.responseText));

                    } catch (err) {

                        this.modalShow(false);
                        reject(err);

                    }
                };

                ajax.onerror = event => {
                    reject(event);
                };

                // enquanto o envio está sendo feito, muda a barra de progresso do upload
                ajax.upload.onprogress = event => {

                    this.uploadProgress(event, file);

                };

                // criando um formData para envio do arqv
                let formData = new FormData();

                // (nome do aqrv no server, arqv para ser enviado)
                formData.append('input-file', file);

                // salvando o momento em que o arqv foi enviado para upload e
                // assim, ser capaz de calcular o tempo restante
                this.startUploadTime = Date.now();

                // enviando via ajax
                ajax.send(formData);

            }));
        });

        // Promise.all trata várias promessas ao msm tempo
        return Promise.all(promises);

    }

    uploadProgress(event, file)
    {

        // temp gasto desde o início do upload
        let timespent = Date.now() - this.startUploadTime;
        let loaded = event.loaded;
        let total = event.total;
        let porcent = parseInt((loaded/total) * 100);
        // tempo restante estimado
        let timeleft = ((100 - porcent) * timespent) / porcent;

        // modifica o tamanho da barra de % de arq enviado
        this.progressBarEl.style.width = `${porcent}%`;

        this.filenameEl.innerHTML = file.name;
        this.timeleftEl.innerHTML = this.formatTimeToHuman(timeleft);

    }

    // transforma o tempo de ms para um formato mais agradável
    formatTimeToHuman(duration)
    {

        let seconds = parseInt((duration / 1000) % 60);
        let minutes = parseInt((duration / (1000 * 60 )) % 60);
        let hours = parseInt((duration / (1000 * 60 * 60)) % 24);

        // vendo se o tempo estimado cehgará aos minutos, hrs etc
        if (hours > 0) return `${hours} horas, ${minutes} minutos e ${seconds} segundos`;
        
        if (minutes > 0) return `${minutes} minutos e ${seconds} segundos`;

        if (seconds > 0) return `${seconds} segundos`;  

        return '';

    }

}