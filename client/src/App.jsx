import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Hero from './components/Hero.jsx';
import DropZone from './components/DropZone.jsx';
import VerifySection from './components/VerifySection.jsx';
import DocumentList from './components/DocumentList.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 relative z-10 py-12 px-4">
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/upload" element={<DropZone />} />
          <Route path="/verify" element={<VerifySection />} />
          <Route path="/documents" element={<DocumentList />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}
