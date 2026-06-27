import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home/Home'
import Auth from './pages/Auth'
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
import GameFontProof from './pages/Game/GameFontProof'
import Sponsor from './pages/Sponsor'
import GameEmulator from './pages/Game/GameEmulator'
import RequireAuth from './RequireAuth'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      
      <Route path="/game" element={<GameIndex />} />
      <Route path="/game/:platform/:gameSlug/announce" element={<GameAnnounce />} />
      <Route path="/game/:platform/:gameSlug/main" element={<RequireAuth><GameMainSets /></RequireAuth>} />
      <Route path="/game/:platform/:gameSlug/edit/:setId" element={<RequireAuth><GameEditor /></RequireAuth>} />
      <Route path="/game/:platform/:gameSlug/requests" element={<RequireAuth><GameRequests /></RequireAuth>} />
      <Route path="/game/:platform/:gameSlug/requests/:requestId" element={<RequireAuth><GameRequestDetail /></RequireAuth>}/>
      <Route path="/game/:platform/:gameSlug/search" element={<RequireAuth><GameSearch /></RequireAuth>} />
      <Route path="/game/:platform/:gameSlug/issues" element={<GameIssues />} />
      <Route path="/game/:platform/:gameSlug/issues/:issueId" element={<GameIssueDetail />} />
      <Route path="/game/:platform/:gameSlug/glossary" element={<RequireAuth><GameGlossary /></RequireAuth>} />
      <Route path="/game/:platform/:gameSlug/font" element={<RequireAuth><GameFontProof /></RequireAuth>} />
      <Route path="/emulator" element={<GameEmulator />} />
      <Route path="/game/:platform/:gameSlug/play" element={<Navigate to="/emulator" replace />} />
      <Route path="/game/:platform/:gameSlug" element={<RequireAuth><GameBrowse /></RequireAuth>} />

      <Route path="/sponsor" element={<Sponsor />} />

      <Route path="/auth" element={<Auth />} />
    </Routes>
  )
}

export default App
