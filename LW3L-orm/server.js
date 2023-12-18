import express from 'express';
import Task from './models/Task.js';

const app = express();
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));

app.post("/add", async function (req, res) {
  const task = new Task();
  task.Brand = req.body.Brand;
  task.Price = req.body.Price;
  task.Size = req.body.Size;
  task.Bought = 0;
  task.Cause = req.body.Cause;
  await task.save();
  res.redirect('/');
});

app.get("/", async function (req, res) {
  const wishlistTasks = await Task.loadMany({Bought : 0});
  const tasks = await Task.loadMany({Bought : 1});
  const brokenTasks = await Task.loadMany({Bought : 1 , Broken : 1});
  res.render('listTasks.ejs', { wishlistTasks, tasks , brokenTasks });
});


app.get("/delete/:id", async function (req, res) {
  await Task.delete({ id: req.params.id });
  res.redirect('/');
});


app.get('/broken/:id', async function(req, res){
  const task = await Task.load({id: req.params.id});
  task.Broken = 1;
  task.Bought = 1;
  await task.save();
  res.redirect('/');
});

app.get("/buy/:id", async function (req, res) {
  const task = await Task.load({ id: req.params.id });
  task.Bought = 1;
  task.Broken = 0;
  await task.save();
  res.redirect('/')
});

app.get('/moveToWishlist/:id', async (req, res) => {
  const id = req.params.id;
  const task = await Task.load({ id: id });
  task.Bought = 0;
  await task.save();
  res.redirect('/'); // Rediriger vers la page principale
});

app.get('/repaired/:id', async function(req, res){
  const task = await Task.load({id: req.params.id});
  task.Broken = 0;
  task.Bought = 0;
  await task.save();
  res.redirect('/'); // Rediriger vers la page principale
});


app.listen(4000);

