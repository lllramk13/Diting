import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home/Home'
import Browse from './pages/P2IS/Browse'
import MainSets from './pages/P2IS/MainSets'
import Editor from './pages/P2IS/Editor'
import Auth from './pages/P2IS/Auth'
import Issues from  './pages/P2IS/Issues'
import IssuesDetail from './pages/P2IS/IssuesDetail'
import Search from './pages/P2IS/Search'
import Requests from './pages/P2IS/Requests'
import RequestDetail from './pages/P2IS/RequestDetail'
import Announce from './pages/P2IS/Announce'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/game/psx/p2is" element={<Browse />} />
      <Route path="/game/psx/p2is/main" element={<MainSets />} />
      <Route path="/game/psx/p2is/edit/:setId" element={<Editor />} />
      <Route path="/game/psx/p2is/search" element={<Search />} />
      <Route path="/game/psx/p2is/requests" element={<Requests />} />
      <Route path="/game/psx/p2is/requests/:requestId" element={<RequestDetail />} />
      <Route path="/game/psx/p2is/announce" element={<Announce />} />
      <Route path="/game/psx/p2is/issues" element={<Issues />} />
      <Route path="/game/psx/p2is/issues/:issueId" element={<IssuesDetail/>} />
      <Route path="/auth" element={<Auth />} />
    </Routes>
  )
}

export default App
