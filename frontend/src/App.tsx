import {Route, Routes} from "react-router-dom";
import Home from "./pages/Home/Home";
import P2IS from "./pages/P2IS";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/game/psx/p2is" element={<P2IS />}/>
        </Routes>
    )
}

export default App