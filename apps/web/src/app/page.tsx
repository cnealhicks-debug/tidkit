'use client';

import { Navigation } from '@tidkit/ui';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navigation currentApp="home" />

      {/* Hero Section */}
      <section className="hero-gradient py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            True-to-Scale Textures
            <br />
            <span className="text-tidkit-600">for Model Makers</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Create perfectly scaled textures and papercraft buildings for model
            railroads, wargaming miniatures, and dollhouses.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="http://localhost:3001"
              className="px-8 py-4 bg-tidkit-600 text-white text-lg font-semibold rounded-xl hover:bg-tidkit-700 transition-colors shadow-lg shadow-tidkit-600/25"
            >
              Open Builder
            </a>
            <a
              href="http://localhost:3002"
              className="px-8 py-4 bg-white text-tidkit-700 text-lg font-semibold rounded-xl hover:bg-gray-50 transition-colors border-2 border-tidkit-200"
            >
              Open Studio
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything You Need
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Builder Card */}
            <div className="feature-card bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-7 h-7 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Building Generator
              </h3>
              <p className="text-gray-600 mb-6">
                Create parametric 3D buildings and unfold them into printable
                patterns. Perfect for Cricut or manual cutting.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li className="flex items-center gap-2">
                  <CheckIcon /> 17 model scales (HO, N, O, 28mm, etc.)
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon /> 4 roof styles (flat, gable, hip, shed)
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon /> 22 building templates
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon /> SVG/PDF export for cutting
                </li>
              </ul>
              <a
                href="http://localhost:3001"
                className="inline-flex items-center text-tidkit-600 font-semibold hover:text-tidkit-700"
              >
                Open Builder
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>
            </div>

            {/* Studio Card */}
            <div className="feature-card bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-7 h-7 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Texture Studio
                <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                  Beta
                </span>
              </h3>
              <p className="text-gray-600 mb-6">
                Process photos into seamless, true-to-scale textures. Automatic
                DPI calculation ensures perfect print size.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li className="flex items-center gap-2">
                  <CheckIcon /> Smart seamless generation
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon /> True-to-scale DPI calculator
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon /> Color adjustments
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon /> Tiled preview mode
                </li>
              </ul>
              <a
                href="http://localhost:3002"
                className="inline-flex items-center text-tidkit-600 font-semibold hover:text-tidkit-700"
              >
                Open Studio
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Scales Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            All Popular Scales Supported
          </h2>
          <p className="text-gray-600 mb-8">
            From tiny Z scale to large G scale trains, and everything in between.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {[
              { name: 'Z', ratio: '1:220' },
              { name: 'N', ratio: '1:160' },
              { name: 'HO', ratio: '1:87' },
              { name: 'S', ratio: '1:64' },
              { name: 'O', ratio: '1:48' },
              { name: 'G', ratio: '1:22.5' },
              { name: '6mm', ratio: '1:285' },
              { name: '15mm', ratio: '1:100' },
              { name: '28mm', ratio: '1:56' },
              { name: '1:48', ratio: 'Quarter' },
              { name: '1:24', ratio: 'Half' },
              { name: '1:12', ratio: 'Standard' },
            ].map((scale) => (
              <div
                key={scale.name}
                className="bg-white rounded-lg p-3 border border-gray-200"
              >
                <div className="font-bold text-gray-900">{scale.name}</div>
                <div className="text-xs text-gray-500">{scale.ratio}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-tidkit-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Build?
          </h2>
          <p className="text-tidkit-100 mb-8">
            Start creating perfectly scaled models today. No account required.
          </p>
          <a
            href="http://localhost:3001"
            className="inline-block px-8 py-4 bg-white text-tidkit-700 text-lg font-semibold rounded-xl hover:bg-tidkit-50 transition-colors"
          >
            Get Started Free
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white font-bold">
            <svg
              className="w-6 h-6 text-tidkit-400"
              viewBox="0 0 32 32"
              fill="none"
            >
              <rect
                x="4"
                y="8"
                width="24"
                height="20"
                rx="2"
                fill="currentColor"
                fillOpacity="0.3"
              />
              <path
                d="M4 10C4 8.89543 4.89543 8 6 8H26C27.1046 8 28 8.89543 28 10V12H4V10Z"
                fill="currentColor"
              />
            </svg>
            TidKit
          </div>
          <div className="text-sm">
            © {new Date().getFullYear()} TidKit. Free for personal use.
          </div>
        </div>
      </footer>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-green-500 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
