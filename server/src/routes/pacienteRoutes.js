const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  listarPacientes, obterPaciente, criarPaciente, importarPacientes, removerPaciente
} = require('../controllers/pacienteController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.get('/', listarPacientes);
router.post('/importar', upload.single('arquivo'), importarPacientes);
router.get('/:id', obterPaciente);
router.post('/', criarPaciente);
router.delete('/:id', removerPaciente);

module.exports = router;