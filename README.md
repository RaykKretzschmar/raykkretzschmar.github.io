# Rayk's Portfolio Website

This is my personal portfolio website, designed to showcase my projects, skills, and experience. It features a digital clone chatbot that allows visitors to interact with a virtual version of me.

You can visit the live site here: [raykkretzschmar.vercel.app](https://raykkretzschmar.vercel.app)

## How I Built It

This project is a modern web application built with a focus on performance and interactivity.

### Frontend
The frontend is built using **Vanilla HTML, CSS, and JavaScript**. This ensures a lightweight and fast-loading user experience without the overhead of heavy frameworks.
-   **Styling**: Custom CSS is used for the design, including dark mode support and responsive layouts.
-   **Interactivity**: JavaScript handles dynamic elements, including a custom gravity simulation and the chat interface.

### Backend & Chatbot
The backend is powered by **Vercel Serverless Functions** written in **TypeScript**.
-   **Chatbot**: The digital clone is powered by OpenAI's **gpt-4o-mini** model. It uses a serverless API route (`/api/chat`) to process user messages and generate responses based on my personal context.
-   **Contact Form**: A separate serverless function (`/api/contact`) handles contact form submissions using `nodemailer`.

### Hosting
The website is hosted on **Vercel**, taking advantage of their seamless integration with GitHub and support for serverless functions.