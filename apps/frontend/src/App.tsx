import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { Home } from './pages/Home';
import { Feed } from './pages/Feed';
import { Dashboard } from './pages/Dashboard';
import { Search } from './pages/Search';
import { CreatorDetail } from './pages/CreatorDetail';
import { ApplyCreator } from './pages/ApplyCreator';
import { SignDocuments } from './pages/SignDocuments';
import { InviteCreator } from './pages/InviteCreator';
import { AccountSettings } from './pages/AccountSettings';

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/search" element={<Search />} />
          <Route path="/settings" element={<AccountSettings />} />
          <Route path="/creator/:id" element={<CreatorDetail />} />
          <Route path="/invite/:name" element={<InviteCreator />} />
          <Route path="/apply" element={<ApplyCreator />} />
          <Route path="/apply/sign-documents" element={<SignDocuments />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
