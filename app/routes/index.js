var express = require('express');
var router = express.Router();
var formidable = require('formidable');
//require para verificar existência de arqv
var fs = require('fs');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// criando rota para deletar arqvs
router.delete('/file', (req, res) => {

  let form = new formidable.IncomingForm({
    uploadDir: './upload',
    keepExtensions: true
  });

  form.parse(req, (err, fields, files) => {

    let path = "./" + fields.path;
    
    if (fs.existsSync(path)) 
    {

      // excluindo arqv com unlink
      fs.unlink(path, err => {

        // caso haja erro
        if (err) 
        {
          re.status(400).json({
            err
          });
        } else {

          res.json({   
            fields
          });
      
        }

      });
      
    }

  });

});

// criando a rota para envio dos arquivos via POST
router.post('/upload', (req, res) => {

  // estamos usando a API formidable para tratar dessas rotas
  // com arquivos. 
  let form = new formidable.IncomingForm({
    uploadDir: './upload',
    keepExtensions: true
  });

  form.parse(req, (err, fields, files) => {

    // resposta será recebida no corpo da msg como um JSON
    res.json({
      files
    });

  });

});

module.exports = router;
