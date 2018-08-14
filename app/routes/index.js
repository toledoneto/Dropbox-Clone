var express = require('express');
var router = express.Router();
var formidable = require('formidable');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
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
