# NodeLabz — Frontend Review Notes
# ⚠️ DO NOT EDIT — These are founder review notes from the walkthrough on March 16-17, 2026.

**Date:** March 16-17, 2026
**Reviewed by:** Federico Tafur
**Status:** Collected — needs planning session to prioritize and implement

---

## 1. Login (`/auth/login`)
- Implement JWT tokens that expire by time of inactivity
- Add lazy loader between login and dashboard — verify ALL platform information is loaded and ready before showing the UI

## 2. Org Page (`/dashboard/org`)
- "New Project" button could have templates for different use cases (marketing, data analysis, financial, etc.) — not defined, just a thought

## 3. Dashboard Home (`/dashboard`)
- Remove the user profile icon from the mini sidebar — only keep the one on the navbar

## 4. Health Score
- Data display is too generic and non-functional, needs redesign

## 5. Metricas
- Too generic, organize more intentionally
- Make cards drag-and-drop so users can choose what's important and reorder — like Robinhood Legend functionality

## 6. Node Map
- Delete the Node Map internal navbar (the one with "6 Healthy, 2 Warning, 1 Error")
- Integrate AI so it can manipulate the map, add case scenarios, move nodes, highlight paths

## 7. Recomendaciones IA
- Needs better UI

## 8. Digest Diario
- Create functionality to connect to Telegram, WhatsApp, or other channels for daily phone notifications
- Fix UI and data shown to be more valuable to users
- Needs planning

## 9. Conectar plataforma
- Make cards bigger (like company cards on org page)
- Add logos of the applications

## 10. Generar reporte
- Users should describe what they want by talking with AI
- AI digests the information and uses the visualization libraries to generate visuals, recommendations, explanations

## 11. Todos los contactos
- Create magic wizard flow for generating new contacts
- CSV import functionality
- Filter functionality
- Click on a lead → pop-up with more information and actions
- Needs more planning

## 12. Empresas
- Add a company functionality
- Click on company → pop-up with all information and actions
- Filter functionality
- Dive in-depth with a node graph to understand where leads come from visually

## 13. Importar contactos
- Create CSV and "Desde Plataforma" functionality through a magic wizard

## 14. Pipeline principal
- AI can help create the pipeline
- Sidebar with drag-and-drop nodes to edit pipeline manually
- Make it easy to create and understand
- Testing tab: with real data + AI/ML predict if pipeline would be more effective, show confidence and reasoning

## 15. Deals
- Implement Add Deal functionality
- Connect it so everything populates automatically

## 16. Actividades
- Connect to the backend

## 17. Etiquetas
- Click on cards → pop-up showing all characteristics of how a lead is qualified for that tag

## 18. Listas inteligentes
- AI automatically creates lists based on trends it's been noting
- Goal: help company enhance business, get more qualified leads, generate more revenue

## 19. Lead scoring
- Users can edit lead scoring settings based on preferences
- Different templates based on different preferences/industries

## 20. Todas las campanas
- Magic wizard for campaign creation
- Choose campaign type and work on it
- Store drafts, active, inactive states
- Testing campaign functionality
- Recommendations tab (e.g., if emails getting bounces → tips to optimize and fix)

## 21. Crear campana
- Magic wizard to create campaigns

## 22. Meta Ads / Google Ads / TikTok Ads
- Data on how ads are performing
- Maybe a workflow view
- Different tabs showing all possible data from these platforms specifically, all divided

## 23. Generador de copy IA
- Needs more thinking/planning

## 24. Creativos
- Connect with AI (Higgsfield AI, Nano Banana, others)
- Chatbox at bottom with functionality to upload first frame, last frame (how Higgsfield works with video generation)
- Prompt engineering: user describes what they want, we optimize the prompt for better results
- Credit system: don't let users go crazy. If over credits, they can integrate their own API key

## 25. Calendario
- Connect functionality so users can connect to their favorite calendar app
- Click on a day → pop-up with day calendar
- Click on an event → pop-up with event information

## 26. Email Campanas
- Create the page for generating email campaigns
- Slider in the middle to hide/show campaign creation vs campaign information

## 27. Plantillas
- Create actual email designs that are proven to work
- Easy to change text and content

## 28. Secuencias
- More visual — use boxes and nodes with the existing libraries
- Click on sequence boxes → see all information about the automatic sequences

## 29. Editor drag & drop
- Add preview functionality
- Add test email functionality
- Add more drag-and-drop block options (currently too generic)
- Code editor option: paste HTML code and use that email

## 30. Previsualizacion
- Choose which template or email campaign to preview
- After choosing, see preview on phone and desktop

## 31. Entregas / Aperturas / Clics
- Implement all tracking services and functionalities
- Once an email is sent through the platform, automatically track: opened, clicked, delivered, never opened
- Capture the most amount of data possible

## 32. WhatsApp Conversaciones
- Track all conversations and leads from different platforms
- If AI is responding automatically, check how those are doing
- Create a tab for human-delegated responses (when AI hands off to human, human goes in and manually responds)

## 33. WhatsApp Plantillas
- Create nodes with settings for the AI: personality, name, first message, what data it has access to
- CRITICAL: specifically separate what data the AI can access — prevent AI from giving sensitive information to users
- Define rules for what the AI can and cannot share

## 34. WhatsApp Broadcasts
- AI works simultaneously with user to create WhatsApp campaigns
- Mass messaging for promotions to contacts who have been reaching out via WhatsApp
- Editor to create, preview, and test messages

## 35. Respuestas IA
- This is where AI settings go: name, personality, qualification questions for leads
- Need to evaluate overlap with #33 and #38

## 36. Secuencias (WhatsApp)
- More visual using the existing libraries (nodes, boxes)
- Create sequences visually
- Pop-ups for sequence step information

## 37. Numero conectado
- Show information about connected number(s)
- Ability to connect more than one WhatsApp phone number (for big companies)
- Integrate all numbers together

## 38. Reglas
- Evaluate if this is repetitive with #33 and #35 (AI settings)
- Need to plan whether to consolidate or keep separate

## 39. Social Calendario
- Needs better planning

## 40. Social Crear publicacion
- Preview, test, AI/ML test, analyzing, creation, better UI

## 41. Social Canales (Facebook/Instagram/TikTok/LinkedIn)
- More planning on what information to display

## 42. Social Bandeja de entrada
- Show all messages with filtering capability

## 43. Social Menciones
- Check if people have talked about the platform online and what they said

## 44. Automatizaciones — Todos los workflows
- Better visual UI
- Implement AI
- Drag and drop functionality, boxes, connectors

## 45. Automatizaciones — Crear workflow
- *(Deferred — "plan the rest later")*

---

## Sections Not Yet Reviewed (deferred)
- Automatizaciones: Crear workflow, Formularios, Lead score, Email events, Ejecuciones recientes, Errores
- Reportes: all subsections
- Integraciones: all subsections
- Configuracion: all subsections
- Gestion de Clientes: all subsections
- AI Chat panel

---

## Recurring Themes
1. **Magic Wizards** — guided creation flows for contacts, campaigns, imports, pipelines
2. **AI everywhere** — AI assists in creation, recommendations, predictions, analysis
3. **Pop-up details** — click any card/item → pop-up with full info and actions (not page navigation)
4. **Visual builders** — use @xyflow nodes/boxes for sequences, pipelines, workflows, not just lists
5. **Preview + Test** — every content creation needs preview (desktop/mobile) and test send
6. **Better UI** — many sections are too generic, need more intentional design
7. **Credit system** — for AI features (generation, etc.), with option to bring own API key
8. **Data tracking** — maximize data collection across all channels
9. **Filtering** — every list/table needs robust filtering
10. **Calendar integration** — connect to external calendar apps

---

*These notes were collected during the founder walkthrough. They represent the gap between current wireframes and production-ready features. A planning session is needed to prioritize, estimate, and schedule implementation.*
