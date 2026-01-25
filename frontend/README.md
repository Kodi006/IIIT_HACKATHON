# NeuroMed Frontend

Modern, stunning web interface for the NeuroMed AI system.

## Built With

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icon library

## Features

- 🎨 Modern glassmorphism UI design
- ✨ Smooth animations and transitions
- 📱 Fully responsive layout
- 🌙 Dark mode optimized
- ⚡ Fast and performant
- ♿ Accessible components

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx       # Root layout with metadata
│   ├── page.tsx         # Main application page
│   └── globals.css      # Global styles and animations
├── components/
│   └── ui/              # Reusable UI components
├── lib/
│   ├── api.ts           # API client and types
│   └── utils.ts         # Utility functions
└── public/              # Static assets
```

## Key Components

### Main Page (`app/page.tsx`)

- Clinical note input with OCR support
- Real-time analysis with loading states
- Interactive results display
- Evidence traceability explorer

### API Client (`lib/api.ts`)

- Type-safe API calls
- Error handling
- Request/response type definitions

### Utilities (`lib/utils.ts`)

- Class name merging (cn)
- Confidence level formatting
- Color scheme helpers

## Styling

### Tailwind Configuration

- Custom color palette for clinical theme
- Custom animations (fade-in, slide-in, pulse-glow)
- Glassmorphism utilities
- Responsive breakpoints

### Global Styles

- CSS custom properties for theming
- Dark mode support
- Custom scrollbar styling
- Gradient text utilities

## Performance

- Code splitting with Next.js App Router
- Optimized images with next/image
- Lazy loading components
- Minimal bundle size

## Accessibility

- Semantic HTML
- ARIA labels where needed
- Keyboard navigation
- Screen reader friendly

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Tips

```bash
# Type checking
npm run build

# Lint code
npm run lint

# Clear Next.js cache
rm -rf .next
```

## Deployment

### Vercel (Recommended)

```bash
vercel --prod
```

### Other Platforms

- Build output: `.next/`
- Node.js 18+ required
- Set environment variables in platform

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)
