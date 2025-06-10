import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Launcher from './Launcher';
import HomePage from './Home';
import './App.css';

// this file will contain the browser routes that are used by React Router

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/app' element={<HomePage />} />
        <Route path='/' element={<Launcher />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
