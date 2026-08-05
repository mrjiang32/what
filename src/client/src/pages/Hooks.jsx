import { useState } from "react";
import reactLogo from "../assets/react.svg";
import viteLogo from "../assets/vite.svg";
import heroImg from "../assets/hero.png";
import "../App.css";
import "../index.css";

async function getATable() {
    
}

function App() {
  const [count, setCount] = useState(0);
  const [test1, setTest1] = useState("");

  return (
    <>
      <section id="center">
        <div>
          <table>

          </table>
        </div>
      </section>
    </>
  );
}

export default App;
