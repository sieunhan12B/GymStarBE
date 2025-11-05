const express = require('express');
const app = express();
const PORT = 3000;

// Middleware để parse JSON
app.use(express.json());

// Route cơ bản
app.get('/', (req, res) => {
  res.send('Hello Express Backend!');
});

// Lắng nghe server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
