class DropBoxController
{

    constructor()
    {

        // criando um array de pastas para navegação de pastas na aplicação. Deixando uma principal
        // default para referência do DB
        this.currentFolder = ['main'];

        // elemento de breadCrumbs, ou seja, o path em forma de link no topo da pág para voltar a alguma pasta
        this.navEl = document.querySelector('#browse-location');
        
        // criando um evento para avisar a quem quiser ouvir que houve uma mudança
        // na seleção de um dos itens da tela. Esse é um evento personalizado
        this.onselectionchange = new Event('selectionchange');

        // janela de input de arqv
        this.inputFilesEl = document.querySelector('#files');

        // modal da barra de progresso do upload do arqv
        this.snackModalEl = document.querySelector('#react-snackbar-root');
        this.progressBarEl = this.snackModalEl.querySelector('.mc-progress-bar-fg');
        // nome na barra modal
        this.filenameEl = this.snackModalEl.querySelector('.filename');
        // tempo restante na barra modal
        this.timeleftEl = this.snackModalEl.querySelector('.timeleft');
        // ID do HTML onde ficam os itens mostrados na tela
        this.listFilesEl = document.querySelector('#list-of-files-and-directories');

        //botões da aplicação
        this.btnNewFolder = document.querySelector('#btn-new-folder'); // botão nova pasta
        this.btnRename = document.querySelector('#btn-rename');        // botão renomear
        this.btnDelete = document.querySelector('#btn-delete');        // botão deletar
        this.btnSendFileEl = document.querySelector('#btn-send-file'); // botão enviar
        
        // conecta ao Firebase
        this.connectFirebase();

        // inicia os eventos
        this.initEvents();

        // ao abrir a app pela 1ª vez, temos a 1ª abertura de pasta: pasta main
        this.openFolder()

    }

    connectFirebase()
    {

        // var config = { your Firebase data };

        var config = {
            apiKey: "AIzaSyCck-RgbSXA35Yjy01JPuyyADaG3u4hm-E",
            authDomain: "dropbox-clone-1aa13.firebaseapp.com",
            databaseURL: "https://dropbox-clone-1aa13.firebaseio.com",
            projectId: "dropbox-clone-1aa13",
            storageBucket: "dropbox-clone-1aa13.appspot.com",
            messagingSenderId: "360546635360"
        };
        
        firebase.initializeApp(config);

    }

    getSelection()
    {

        return this.listFilesEl.querySelectorAll('.selected');

    }

    initEvents()
    {

        // evento para botão de criar nova pasta
        this.btnNewFolder.addEventListener('click', e => {

            let name = prompt("Nome da nova pasta");

            // se o user digitou um nome
            if (name) 
            {

                this.getFirebaseRef().push().set({
                    name, 
                    type: 'folder',  // cria um ícone do tipo folder na tela da app
                    path: this.currentFolder.join('/') // concatena o path com o elemento criado no construtor
                });
                
            }

        });

        // evento do botão de exclusão de arqvs
        this.btnDelete.addEventListener('click', e => {

            this.removeTask().then(responses => {
                
                responses.forEach(response => {

                    // verificando se a chave que se quer excluir existe no DB
                    if (response.fields.key) 
                    {

                        // child representa o nó desejado com hash = ao param passado
                        this.getFirebaseRef().child(response.fields.key).remove();
                        
                    }
                });

            }).catch(err => {
                console.error(err);
            });

        });

        // evento de clicar no botão rename
        this.btnRename.addEventListener('click', e => {

            // pega o elemento escolhido
            let li = this.getSelection()[0];

            // decodifica o JSON criado
            let file = JSON.parse(li.dataset.file);

            // cria o modal de input do novo name
            let name = prompt("Renomear o arquivo: ", file.name);
            
            // se o user digitou um novo nome
            if (name) 
            {

                file.name = name;

                // altera no banco
                this.getFirebaseRef().child(li.dataset.key).set(file);
                
            }

        });

        // ouvinte do evento personalizado criado no constructor
        this.listFilesEl.addEventListener('selectionchange', e => {

            // verificando quantos itens estão selecionados pois os botões tem aplicações diferente:
            // 1. botão rename: apenas se um item estiver selecionado
            // 2. botão delete: ao menos um item tem que estar selecionado

            switch (this.getSelection().length)
            {
                case 0:
                    this.btnDelete.style.display = 'none';
                    this.btnRename.style.display = 'none';
                    break;

                case 1:
                    this.btnDelete.style.display = 'block';
                    this.btnRename.style.display = 'block';
                    break;
            
                default:
                    this.btnDelete.style.display = 'block';
                    this.btnRename.style.display = 'none';
                    break;
            }

        });

        this.btnSendFileEl.addEventListener('click', event => {

            // 'força' o click no botão para abrir janela de abrir arqvs
            this.inputFilesEl.click();

        });

        this.inputFilesEl.addEventListener('change', event => {

            // trava o botão de envio de arqv para n ocorrer erro
            this.btnSendFileEl.disabled = 'true';

            // método para poder carregar mais de um arqv ao msm tempo.
            // target é o janela de inputFilesEl, o evento é a mudança dessa janela 
            //e o files são os arqvs enviados. A promessa retornada é usada para salvar no Firebase
            this.uploadTask(event.target.files).then(responses => {

                // percorrendo cada uma das respostas retornadas
                responses.forEach(resp => {

                    // novo modo de buscar a URL do arqv no Firebase
                    resp.ref.getDownloadURL().then(downloadURL => {

                        // add uma nova entrada no DB
                        this.getFirebaseRef().push().set({
                            name: resp.name,
                            type: resp.contentType,
                            path: downloadURL,
                            size: resp.size
                        });

                    });

                });

                this.uploadComplete();

            }).catch(err => {

                this.uploadComplete();
                console.error(err);
                
            });

            // coloca o modal de barra de carregamento
            this.modalShow();

        });

    }

    // método que executa as operações após término do upload
    uploadComplete()
    {

        // esconde o modal de arqv carregado
        this.modalShow(false);

        // zerando o campo de envio para ser possível enviar outros arqvs
        this.inputFilesEl.value = '';

        // destrava o botão de envio de arqv
        this.btnSendFileEl.disabled = 'false';

    }

    // pega a referência do DB
    getFirebaseRef(path)
    {

        // se não passarmos um path, o app irá considerar o path a pasta atual
        if(!path) path = this.currentFolder.join('/');

        // cria uma referência com o nome files no DB
        return firebase.database().ref(path);

    }

    modalShow(show = true)
    {

        this.snackModalEl.style.display = (show) ? 'block' : 'none';

    }

    ajax(url, method = 'GET', formData = new FormData(), onprogress = function() {}, onloadstart = function() {})
    {

        return new Promise((resolve, reject) => {
            
            // cria uma conexão AJAX...
            let ajax = new XMLHttpRequest();

            // ...e envia via method
            ajax.open(method, url);

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

            // enquanto o envio está sendo feito, muda a barra de progresso do upload
            ajax.upload.onprogress = onprogress;

            // salvando o momento em que o arqv foi enviado para upload e
            // assim, ser capaz de calcular o tempo restante
            onloadstart();

            // enviando via ajax
            ajax.send(formData);

        });

    }

    uploadTask(files)
    {

        // cada arqv vai ter a sua promessa, em caso de envio de mais de um arqv, por isso o array de promessas
        let promises = [];

        // para cada file enviado...
        [...files].forEach(file => {

            // enviando a promessa para o o array
            promises.push(new Promise((resolve, reject) => {

                // criando uma referência para armazenar no storage
                let fileRef = firebase.storage().ref(this.currentFolder.join('/')).child(file.name);

                // fazendo o upload
                let task = fileRef.put(file);

                // podemos ver o processamento do upload pelo método state_changed
                task.on('state_changed', snapshot => {
                    
                    // on progress
                    this.uploadProgress({
                        loaded: snapshot.bytesTransferred,
                        total: snapshot.totalBytes
                    }, file);

                }, error => {
                    
                    // on error
                    console.error(error);
                    reject(error);

                }, () => {

                    //on resolve

                    // recebendo os dados do arqv enviado
                    fileRef.getMetadata().then(metadata => {
                        resolve(metadata);
                    }).catch(err => {
                        reject(err);
                    });

                });

            }));
            
        });

        this.startUploadTime = Date.now();

        // Promise.all trata várias promessas ao msm tempo
        return Promise.all(promises);

    }

    removeFile(ref, name)
    {

        // criando uma referência para armazenar no storage
        let fileRef = firebase.storage().ref(ref).child(name);

        // deletando
        return fileRef.delete();

    }

    removeFolderTask(ref, name)
    {

        return new Promise((resolve, reject) => {

            // recuperando a ref no DB
            let folderRef = this.getFirebaseRef(ref + '/' + name);

            folderRef.on('value', snapshot => {

                folderRef.off('value');

                snapshot.forEach(item => {
                    
                    let data = item.val();
                    data.key = item.key;

                    if (data.type === 'folder') 
                    {

                        this.removeFolderTask(ref + '/' + name, data.name).then(() => {

                            resolve({
                                fields:{
                                    key: data.key
                                }
                            });

                        }).catch(err => {
                            reject(err);
                        });
                        
                    } else if (data.type){
                        this.removeFile(ref + '/' + name, data.name).then(() => {

                            resolve({
                                fields:{
                                    key: data.key
                                }
                            });

                        }).catch(err => {
                            reject(err);
                        });
                    }

                });

                folderRef.remove();
                

            });

        });

    }

    removeTask()
    {

        let promises = [];

        // pega os elementos selecionados na tela
        this.getSelection().forEach(li => {

            let file = JSON.parse(li.dataset.file);
            let key = li.dataset.key;

            // coloca a promessa no array de promessas
            promises.push(new Promise((resolve, reject) => {

                // verificando se deletamos uma pasta ou um arqv
                if (file.type === 'folder') 
                {

                    this.removeFolderTask(this.currentFolder.join('/'), file.name).then(() => {

                        resolve({
                            fields:{
                                key
                            }
                        });
    
                    });
                    
                } else if(file.type){
                    // esse else if aparece para evitar o problema de arqv undefined que
                    // surge ao se criar uma nova pasta, por isso ao menos
                    // verificamos se estamos apagando algo com tipo

                    this.removeFile(this.currentFolder.join('/'), file.name).then(() => {

                        resolve({
                            fields:{
                                key
                            }
                        });
    
                    });

                }

            }));

        });

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

    // método para retornar o ícone correto do arquivo mostrado na tela do app
    // baseado no mimeType de arqv enviado
    getFileIconView(file)
    {

        switch(file.type)
        {

            case 'folder':
                return `
                    <svg width="160" height="160" viewBox="0 0 160 160" class="mc-icon-template-content tile__preview tile__preview--icon">
                        <title>content-folder-large</title>
                        <g fill="none" fill-rule="evenodd">
                            <path d="M77.955 53h50.04A3.002 3.002 0 0 1 131 56.007v58.988a4.008 4.008 0 0 1-4.003 4.005H39.003A4.002 4.002 0 0 1 35 114.995V45.99c0-2.206 1.79-3.99 3.997-3.99h26.002c1.666 0 3.667 1.166 4.49 2.605l3.341 5.848s1.281 2.544 5.12 2.544l.005.003z" fill="#71B9F4"></path>
                            <path d="M77.955 52h50.04A3.002 3.002 0 0 1 131 55.007v58.988a4.008 4.008 0 0 1-4.003 4.005H39.003A4.002 4.002 0 0 1 35 113.995V44.99c0-2.206 1.79-3.99 3.997-3.99h26.002c1.666 0 3.667 1.166 4.49 2.605l3.341 5.848s1.281 2.544 5.12 2.544l.005.003z" fill="#92CEFF"></path>
                        </g>
                    </svg>
                `;
                break;

            case "image/jpeg":
            case 'image/jpg':
            case 'image/gif':
            case 'image/png':
                return `
                    <svg version="1.1" id="Camada_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="160px" height="160px" viewBox="0 0 160 160" enable-background="new 0 0 160 160" xml:space="preserve">
                        <filter height="102%" width="101.4%" id="mc-content-unknown-large-a" filterUnits="objectBoundingBox" y="-.5%" x="-.7%">
                            <feOffset result="shadowOffsetOuter1" in="SourceAlpha" dy="1"></feOffset>
                            <feColorMatrix values="0 0 0 0 0.858823529 0 0 0 0 0.870588235 0 0 0 0 0.88627451 0 0 0 1 0" in="shadowOffsetOuter1">
                            </feColorMatrix>
                        </filter>
                        <title>Imagem</title>
                        <g>
                            <g>
                                <g filter="url(#mc-content-unknown-large-a)">
                                    <path id="mc-content-unknown-large-b_2_" d="M47,30h66c2.209,0,4,1.791,4,4v92c0,2.209-1.791,4-4,4H47c-2.209,0-4-1.791-4-4V34
                                            C43,31.791,44.791,30,47,30z"></path>
                                </g>
                                <g>
                                    <path id="mc-content-unknown-large-b_1_" fill="#F7F9FA" d="M47,30h66c2.209,0,4,1.791,4,4v92c0,2.209-1.791,4-4,4H47
                                            c-2.209,0-4-1.791-4-4V34C43,31.791,44.791,30,47,30z"></path>
                                </g>
                            </g>
                        </g>
                        <g>
                            <path fill-rule="evenodd" clip-rule="evenodd" fill="#848484" d="M81.148,62.638c8.086,0,16.173-0.001,24.259,0.001
                                    c1.792,0,2.3,0.503,2.301,2.28c0.001,11.414,0.001,22.829,0,34.243c0,1.775-0.53,2.32-2.289,2.32
                                    c-16.209,0.003-32.417,0.003-48.626,0c-1.775,0-2.317-0.542-2.318-2.306c-0.002-11.414-0.003-22.829,0-34.243
                                    c0-1.769,0.532-2.294,2.306-2.294C64.903,62.637,73.026,62.638,81.148,62.638z M81.115,97.911c7.337,0,14.673-0.016,22.009,0.021
                                    c0.856,0.005,1.045-0.238,1.042-1.062c-0.028-9.877-0.03-19.754,0.002-29.63c0.003-0.9-0.257-1.114-1.134-1.112
                                    c-14.637,0.027-29.273,0.025-43.91,0.003c-0.801-0.001-1.09,0.141-1.086,1.033c0.036,9.913,0.036,19.826,0,29.738
                                    c-0.003,0.878,0.268,1.03,1.069,1.027C66.443,97.898,73.779,97.911,81.115,97.911z"></path>
                            <path fill-rule="evenodd" clip-rule="evenodd" fill="#848484" d="M77.737,85.036c3.505-2.455,7.213-4.083,11.161-5.165
                                    c4.144-1.135,8.364-1.504,12.651-1.116c0.64,0.058,0.835,0.257,0.831,0.902c-0.024,5.191-0.024,10.381,0.001,15.572
                                    c0.003,0.631-0.206,0.76-0.789,0.756c-3.688-0.024-7.375-0.009-11.062-0.018c-0.33-0.001-0.67,0.106-0.918-0.33
                                    c-2.487-4.379-6.362-7.275-10.562-9.819C78.656,85.579,78.257,85.345,77.737,85.036z"></path>
                            <path fill-rule="evenodd" clip-rule="evenodd" fill="#848484" d="M87.313,95.973c-0.538,0-0.815,0-1.094,0
                                    c-8.477,0-16.953-0.012-25.43,0.021c-0.794,0.003-1.01-0.176-0.998-0.988c0.051-3.396,0.026-6.795,0.017-10.193
                                    c-0.001-0.497-0.042-0.847,0.693-0.839c6.389,0.065,12.483,1.296,18.093,4.476C81.915,90.33,84.829,92.695,87.313,95.973z"></path>
                            <path fill-rule="evenodd" clip-rule="evenodd" fill="#848484" d="M74.188,76.557c0.01,2.266-1.932,4.223-4.221,4.255
                                    c-2.309,0.033-4.344-1.984-4.313-4.276c0.03-2.263,2.016-4.213,4.281-4.206C72.207,72.338,74.179,74.298,74.188,76.557z"></path>
                        </g>
                    </svg>
                `;
                break;

            case 'application/pdf':
                return `
                    <svg version="1.1" id="Camada_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="160px" height="160px" viewBox="0 0 160 160" enable-background="new 0 0 160 160" xml:space="preserve">
                        <filter height="102%" width="101.4%" id="mc-content-unknown-large-a" filterUnits="objectBoundingBox" y="-.5%" x="-.7%">
                            <feOffset result="shadowOffsetOuter1" in="SourceAlpha" dy="1"></feOffset>
                            <feColorMatrix values="0 0 0 0 0.858823529 0 0 0 0 0.870588235 0 0 0 0 0.88627451 0 0 0 1 0" in="shadowOffsetOuter1">
                            </feColorMatrix>
                        </filter>
                        <title>PDF</title>
                        <g>
                            <g>
                                <g filter="url(#mc-content-unknown-large-a)">
                                    <path id="mc-content-unknown-large-b_2_" d="M47,30h66c2.209,0,4,1.791,4,4v92c0,2.209-1.791,4-4,4H47c-2.209,0-4-1.791-4-4V34
                                            C43,31.791,44.791,30,47,30z"></path>
                                </g>
                                <g>
                                    <path id="mc-content-unknown-large-b_1_" fill="#F7F9FA" d="M47,30h66c2.209,0,4,1.791,4,4v92c0,2.209-1.791,4-4,4H47
                                            c-2.209,0-4-1.791-4-4V34C43,31.791,44.791,30,47,30z"></path>
                                </g>
                            </g>
                        </g>
                        <path fill-rule="evenodd" clip-rule="evenodd" fill="#F15124" d="M102.482,91.479c-0.733-3.055-3.12-4.025-5.954-4.437
                                c-2.08-0.302-4.735,1.019-6.154-0.883c-2.167-2.905-4.015-6.144-5.428-9.482c-1.017-2.402,1.516-4.188,2.394-6.263
                                c1.943-4.595,0.738-7.984-3.519-9.021c-2.597-0.632-5.045-0.13-6.849,1.918c-2.266,2.574-1.215,5.258,0.095,7.878
                                c3.563,7.127-1.046,15.324-8.885,15.826c-3.794,0.243-6.93,1.297-7.183,5.84c0.494,3.255,1.988,5.797,5.14,6.825
                                c3.062,1,4.941-0.976,6.664-3.186c1.391-1.782,1.572-4.905,4.104-5.291c3.25-0.497,6.677-0.464,9.942-0.025
                                c2.361,0.318,2.556,3.209,3.774,4.9c2.97,4.122,6.014,5.029,9.126,2.415C101.895,96.694,103.179,94.38,102.482,91.479z
                                M67.667,94.885c-1.16-0.312-1.621-0.97-1.607-1.861c0.018-1.199,1.032-1.121,1.805-1.132c0.557-0.008,1.486-0.198,1.4,0.827
                                C69.173,93.804,68.363,94.401,67.667,94.885z M82.146,65.949c1.331,0.02,1.774,0.715,1.234,1.944
                                c-0.319,0.725-0.457,1.663-1.577,1.651c-1.03-0.498-1.314-1.528-1.409-2.456C80.276,65.923,81.341,65.938,82.146,65.949z
                                M81.955,86.183c-0.912,0.01-2.209,0.098-1.733-1.421c0.264-0.841,0.955-2.04,1.622-2.162c1.411-0.259,1.409,1.421,2.049,2.186
                                C84.057,86.456,82.837,86.174,81.955,86.183z M96.229,94.8c-1.14-0.082-1.692-1.111-1.785-2.033
                                c-0.131-1.296,1.072-0.867,1.753-0.876c0.796-0.011,1.668,0.118,1.588,1.293C97.394,93.857,97.226,94.871,96.229,94.8z"></path>
                    </svg>
                `;
                break;

            case 'audio/mp3':
            case 'audio/ogg':
            case 'audio/wav':
                return `
                    <svg width="160" height="160" viewBox="0 0 160 160" class="mc-icon-template-content tile__preview tile__preview--icon">
                        <title>content-audio-large</title>
                        <defs>
                            <rect id="mc-content-audio-large-b" x="30" y="43" width="100" height="74" rx="4"></rect>
                            <filter x="-.5%" y="-.7%" width="101%" height="102.7%" filterUnits="objectBoundingBox" id="mc-content-audio-large-a">
                                <feOffset dy="1" in="SourceAlpha" result="shadowOffsetOuter1"></feOffset>
                                <feColorMatrix values="0 0 0 0 0.858823529 0 0 0 0 0.870588235 0 0 0 0 0.88627451 0 0 0 1 0" in="shadowOffsetOuter1"></feColorMatrix>
                            </filter>
                        </defs>
                        <g fill="none" fill-rule="evenodd">
                            <g>
                                <use fill="#000" filter="url(#mc-content-audio-large-a)" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#mc-content-audio-large-b"></use>
                                <use fill="#F7F9FA" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#mc-content-audio-large-b"></use>
                            </g>
                            <path d="M67 60c0-1.657 1.347-3 3-3 1.657 0 3 1.352 3 3v40c0 1.657-1.347 3-3 3-1.657 0-3-1.352-3-3V60zM57 78c0-1.657 1.347-3 3-3 1.657 0 3 1.349 3 3v4c0 1.657-1.347 3-3 3-1.657 0-3-1.349-3-3v-4zm40 0c0-1.657 1.347-3 3-3 1.657 0 3 1.349 3 3v4c0 1.657-1.347 3-3 3-1.657 0-3-1.349-3-3v-4zm-20-5.006A3 3 0 0 1 80 70c1.657 0 3 1.343 3 2.994v14.012A3 3 0 0 1 80 90c-1.657 0-3-1.343-3-2.994V72.994zM87 68c0-1.657 1.347-3 3-3 1.657 0 3 1.347 3 3v24c0 1.657-1.347 3-3 3-1.657 0-3-1.347-3-3V68z" fill="#637282"></path>
                        </g>
                    </svg>
                `;
                break;

            case 'video/mp4':
            case 'video/quicktime':
                return `
                    <svg width="160" height="160" viewBox="0 0 160 160" class="mc-icon-template-content tile__preview tile__preview--icon">
                        <title>content-video-large</title>
                        <defs>
                            <rect id="mc-content-video-large-b" x="30" y="43" width="100" height="74" rx="4"></rect>
                            <filter x="-.5%" y="-.7%" width="101%" height="102.7%" filterUnits="objectBoundingBox" id="mc-content-video-large-a">
                                <feOffset dy="1" in="SourceAlpha" result="shadowOffsetOuter1"></feOffset>
                                <feColorMatrix values="0 0 0 0 0.858823529 0 0 0 0 0.870588235 0 0 0 0 0.88627451 0 0 0 1 0" in="shadowOffsetOuter1"></feColorMatrix>
                            </filter>
                        </defs>
                        <g fill="none" fill-rule="evenodd">
                            <g>
                                <use fill="#000" filter="url(#mc-content-video-large-a)" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#mc-content-video-large-b"></use>
                                <use fill="#F7F9FA" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#mc-content-video-large-b"></use>
                            </g>
                            <path d="M69 67.991c0-1.1.808-1.587 1.794-1.094l24.412 12.206c.99.495.986 1.3 0 1.794L70.794 93.103c-.99.495-1.794-.003-1.794-1.094V67.99z" fill="#637282"></path>
                        </g>
                    </svg>
                `;
                break;
            

            default:
                return `
                    <svg width="160" height="160" viewBox="0 0 160 160" class="mc-icon-template-content tile__preview tile__preview--icon">
                        <title>1357054_617b.jpg</title>
                        <defs>
                            <rect id="mc-content-unknown-large-b" x="43" y="30" width="74" height="100" rx="4"></rect>
                            <filter x="-.7%" y="-.5%" width="101.4%" height="102%" filterUnits="objectBoundingBox" id="mc-content-unknown-large-a">
                                <feOffset dy="1" in="SourceAlpha" result="shadowOffsetOuter1"></feOffset>
                                <feColorMatrix values="0 0 0 0 0.858823529 0 0 0 0 0.870588235 0 0 0 0 0.88627451 0 0 0 1 0" in="shadowOffsetOuter1"></feColorMatrix>
                            </filter>
                        </defs>
                        <g fill="none" fill-rule="evenodd">
                            <g>
                                <use fill="#000" filter="url(#mc-content-unknown-large-a)" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#mc-content-unknown-large-b"></use>
                                <use fill="#F7F9FA" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#mc-content-unknown-large-b"></use>
                            </g>
                        </g>
                    </svg>
                `;
                break;

        }

    }

    // cria cada uma dos itens que serão colocados na tela do app
    getFileView(file, key)
    {

        let li = document.createElement('li');

        // coloca o id do item criado como o id vindo do hash do DB
        // e os dados tbm, porém o 2º vem em forma de OBJ e precisamos 
        // transforma em string
        li.dataset.key = key;
        li.dataset.file = JSON.stringify(file);

        // add o conteúdo do item
        li.innerHTML = `
            ${this.getFileIconView(file)}
            <div class="name text-center">${file.name}</div>
        `;

        // mudandças no CSS do elemento selecionado na tela
        this.initEventsLi(li);

        return li;

    }

    // método para ler os arqv do DB
    readFiles()
    {

        // salvando a última pasta acessada
        this.lastFolder = this.currentFolder.join('/');

        // o Firebase possui o evento value que é disparado cada vez que há uma
        // mudança na armazenagem do DB, assim podemos ficar em constante sinconia com
        // a observação do DB. Esse evento value não é feito do DB para o user, ou seja,
        // não é preciso a aplicação ficar pingando o DB, o próprio DB responde auto// em caso
        // de mudança através do evento
        this.getFirebaseRef().on('value', snapshot => {

            // zerando a lista de itens na tela
            this.listFilesEl.innerHTML = '';

            snapshot.forEach(snapshotItem => {

                // has único de cada elemento no DB
                let key = snapshotItem.key;
                // dados armazenado no elemento
                let data = snapshotItem.val();

                // para evitar erro de aparecer um item undefined na tela ao se criar subpastas,
                // verificamos se o item tem algum dado faltando e, se sim, não o mostramos
                if (data.type) 
                {

                    // add na tela os elementos recebidos
                    this.listFilesEl.appendChild(this.getFileView(data, key));
                    
                }

            })

        });

    }

    // método para abrir pastas da tela de aplicação
    openFolder()
    {

        // quando navegamos para uma subpasta, precisamos apagar a referência da pasta anterior,
        // senão haverá uma acúmulo de referências e uma operação de upload, p.e., poderia
        // add o arqv em todas as pastas no path de navegação
        if(this.lastFolder) this.getFirebaseRef(this.lastFolder).off('value');

        // add, atualiza e renderizao breadcrumbs
        this.renderNav();

        // lê e lista todo os arquivos daquela pasta que está no DB
        this.readFiles();

    }

    // método para atualizar o breadCrumbs
    renderNav()
    {

        let nav = document.createElement('nav');
        // armazena o path de cada pasta
        let path = [];

        // navegando pelas pastas no array de pastas do construtor
        for (let index = 0; index < this.currentFolder.length; index++) 
        {
            
            let folderName = this.currentFolder[index];
            let span = document.createElement('span');

            path.push(folderName);

            // verificando se a pasta atual é a útlima do array. Para isso, como o array inicia em 0,
            // basta vermos se aposição atual +1 = ao tam do array
            if ((index + 1) === this.currentFolder.length) 
            {

                // se for a última pasta, o breadCrumbs vai receber o nome da pasta, mas sem link
                span.innerHTML = folderName;
                
            } else {

                span.className = 'breadcrumb-segment__wrapper';

                span.innerHTML = 
                    `
                        <span class="ue-effect-container uee-BreadCrumbSegment-link-0">
                            <a href="#" data-path="${path.join('/')}" class="breadcrumb-segment">${folderName}</a>
                        </span>
                        <svg width="24" height="24" viewBox="0 0 24 24" class="mc-icon-template-stateless" style="top: 4px; position: relative;">
                            <title>arrow-right</title>
                            <path d="M10.414 7.05l4.95 4.95-4.95 4.95L9 15.534 12.536 12 9 8.464z" fill="#637282" fill-rule="evenodd"></path>
                        </svg>
                    
                    `;

            }

            nav.appendChild(span);
            
        }

        // renderiza o novo navEl
        this.navEl.innerHTML = nav.innerHTML;

        // evento de clicar no breadCrumbs e ir para a respectiva pasta
        this.navEl.querySelectorAll('a').forEach(a => {

            a.addEventListener('click', e => {

                e.preventDefault();

                // recupera a info dentro do dataset que contém o path das pastas
                this.currentFolder =  a.dataset.path.split('/');

                this.openFolder();

            });

        });

    }
    
    initEventsLi(li)
    {

        li.addEventListener('dblclick', e => {

            // verificando se o item clicado foi uma pasta ou um arqv
            let file = JSON.parse(li.dataset.file);

            switch (file.type) {
                // caso seja pasta, temos de navegar até a subpasta
                case 'folder':
                    // adiciona a pasta no array de pastas localizado no costrutor
                    this.currentFolder.push(file.name);
                    this.openFolder();
                    break;
                // caso seja um arqv, temos de abrir na tela
                default:
                    window.open(file.path);
                    break;
            }

        });

        li.addEventListener('click', e => {

            // configurando o evento de seleção múltipla com aux do teclado.
            // tecla SHIFT: ao clicar com SHIFT, devemos saber qual foi o 1º elemento clicado
            // e o último para, então, selecionar todos entre os dois
            if (e.shiftKey) 
            {
                
                // armazena o 1º li selecionado 
                let firstLi = this.listFilesEl.querySelector('.selected');

                // e já tem algum selecionado 1º...
                if(firstLi)
                {

                    let indexStart;
                    let indexEnd;
                    let lis = li.parentElement.childNodes;

                    // para sabermos quais itens estão dentro do range de itens selecionados,
                    // devemos subir para o elemento pai do li atual e percorrer todos seus filhos
                    lis.forEach((el, index) => {

                        if(firstLi === el) indexStart = index;
                        if(li === el) indexEnd = index;

                    });

                    // array para ordenar os elemento dos índices retornados
                    let index = [indexStart, indexEnd].sort();

                    lis.forEach((el, ind) => {
                        if(ind >= index[0] && ind <= index[1]) 
                        {
                            el.classList.add('selected');
                        }
                    });

                    // emite o evento
                    this.listFilesEl.dispatchEvent(this.onselectionchange);

                    // para a execução e impede o toggle do final do método de acontecer
                    return true;

                }

            }
            
            
            // tecla CTRL: como o funcionamento default do app é agir como se o CTRL estivesse pressionado
            // vamos inverter a lógica nesse if abaixo
            if (!e.ctrlKey) 
            {
                
                // seleciona todos os li que estejam com a classe selected...
                this.listFilesEl.querySelectorAll('li.selected').forEach(el => {
                    // ...e remove essa classe
                    el.classList.remove('selected');
                });

            }

            // add a class selected nativa do CSS para mudar o CSS do elemento selecionado
            li.classList.toggle('selected');

            // emite o evento
            this.listFilesEl.dispatchEvent(this.onselectionchange);

        });

    }

}