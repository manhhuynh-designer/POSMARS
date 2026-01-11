# Project Context: POSMARS

## Overview
POSMARS is a web application involving AR (Augmented Reality) and Administration features. It enables users to create and preview AR experiences (likely tracking images, face filters) and manage projects via an admin dashboard.

## Tech Stack
- **Framework**: [Next.js 16.1.1](https://nextjs.org/) (App Router)
- **Language**: TypeScript (`.ts`, `.tsx`)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
  - Plugins: `tailwindcss-animate`
- **Database / Backend**:
  - **Firebase**: Auth, Firestore, Storage (Admin & Client SDKs)
  - **Supabase**: Database interactions
- **3D / AR**:
  - **Three.js**: Core 3D library
  - **@react-three/fiber**: React renderer for Three.js
  - **@react-three/drei**: Helpers for R3F
  - **MindAR**: Web Augmented Reality (Image tracking, Face tracking)
- **Utilities**:
  - `lucide-react`: Icons
  - `jszip`, `exceljs`: File processing
  - `nodemailer`: Email services

## Project Structure
- **/app**: Next.js App Router pages and layouts.
  - `/admin`: Admin dashboard routes.
  - `/api`: Backend API routes.
- **/components**: React components.
  - `/admin`: Admin-specific components (e.g., editors, builders).
  - `/client`: Client-facing components.
- **/lib**: Shared utilities and configurations (Firebase, generic helpers).
- **/hooks**: Custom React hooks.
- **/public**: Static assets.
- **/supabase**: Supabase related files.

## Key Features
- **Project Management**: Create, edit, and manage AR projects.
- **AR Editors**: Custom editors for configuring AR templates (Image Tracking, Face Filters).
- **Preview**: Real-time preview of AR effects.
- **Lead Generation**: Form builders for capturing user data.
