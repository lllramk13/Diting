import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home/Home'
import Auth from './pages/P2IS/Auth'
import GameIndex from  './pages/Game/GameIndex'
import GameAnnounce from "./pages/Game/GameAnnounce"
import GameMainSets from './pages/Game/GameMainSets'
import GameEditor from './pages/Game/GameEditor'
import GameRequests from './pages/Game/GameRequests'
import GameRequestDetail from './pages/Game/GameRequestDetail'
import GameSearch from './pages/Game/GameSearch'
import GameIssues from './pages/Game/GameIssues'
import GameIssueDetail from './pages/Game/GameIssueDetail'
import GameGlossary from './pages/Game/GameGlossary'
import GameBrowse from './pages/Game/GameBrowse'
import Sponsor from './pages/Sponsor'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      
      <Route path="/game" element={<GameIndex />} />
      <Route path="/game/:platform/:gameSlug/announce" element={<GameAnnounce />} />
      <Route path="/game/:platform/:gameSlug/main" element={<GameMainSets />} />
      <Route path="/game/:platform/:gameSlug/edit/:setId" element={<GameEditor />} />
      <Route path="/game/:platform/:gameSlug/requests" element={<GameRequests />} />
      <Route path="/game/:platform/:gameSlug/requests/:requestId" element={<GameRequestDetail />}/>
      <Route path="/game/:platform/:gameSlug/search" element={<GameSearch />} />
      <Route path="/game/:platform/:gameSlug/issues" element={<GameIssues />} />
      <Route path="/game/:platform/:gameSlug/issues/:issueId" element={<GameIssueDetail />} />
      <Route path="/game/:platform/:gameSlug/glossary" element={<GameGlossary />} />
      <Route path="/game/:platform/:gameSlug" element={<GameBrowse />} />
      <Route path="/sponsor" element={<Sponsor />} />

      <Route path="/auth" element={<Auth />} />
    </Routes>
  )
}

export default App
