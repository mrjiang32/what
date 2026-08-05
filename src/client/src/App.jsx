import {Routes,Route,Link} from 'react-router-dom'
import Home from './pages/Home'
import Hooks from './pages/Hooks'
import Navbar from './components/Navbar'

function App() {
  return (
    <div style={{padding:"20px"}}>
      <Navbar/>
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/hooks" element={<Hooks/>}/>
      </Routes>
    </div>
  )
}

export default App;