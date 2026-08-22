import { Github, Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <Shield className="w-4 h-4 text-amber-500/50" />
            <span>Built by <span className="text-zinc-400">Aashif Khan</span></span>
          </div>

          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <span>Powered by SHA-256 & OriginStamp</span>
            <a
              href="https://github.com/0xAashif/Fileguard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
