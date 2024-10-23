# HealthSync: **AI-driven Healthcare & Mental Health Platform**

## Overview

This project is a multi-functional healthcare and mental health platform that integrates features like AI-driven mental health therapy, medicine inventory management, prescription interpretation, and medicine information retrieval. Built using Flask (Python) and React.js , this platform leverages Google’s Gemini-1.5 model for generating health and mental health advice, processing prescription data, and suggesting Ayurvedic alternatives to modern medicines.

---
### Running the Project

---

#### 1. **Backend (Python - Flask)**

**Requirements:**
- Python 3.10
- MySQL server

**Steps:**

1. **Set up Virtual Environment:**
   - Open a terminal in the backend project directory.
   - Create a virtual environment:
     ```bash
     python -m venv venv
     ```
   - Activate the virtual environment:
     - **Windows**:
       ```bash
       venv\Scripts\activate
       ```
     - **macOS/Linux**:
       ```bash
       source venv/bin/activate
       ```

2. **Install Dependencies:**
   - Install the necessary packages listed in the `requirements.txt` file:
     ```bash
     pip install -r requirements.txt
     ```

3. **Configure Environment Variables:**
   - Set the environment variables such as `API_KEY`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

4. **Run the Application:**
   - Start the Flask server:
     ```bash
     python app.py
     ```
   - The backend will be running at `http://localhost:5050`.

---

#### 2. **Frontend (React - Vite)**

**Requirements:**
- Node.js 16.x or higher

**Steps:**

1. **Install Dependencies:**
   - Open a terminal in the frontend project directory.
   - Run the following command to install the required dependencies:
     ```bash
     npm install
     ```

2. **Running the Development Server:**
   - To start the frontend development server, use:
     ```bash
     npm run dev
     ```
   - This will start the Vite server, and the frontend will be accessible at `http://localhost:5173`.

3. **Building for Production:**
   - To create a production build:
     ```bash
     npm run build
     ```

4. **Preview Production Build:**
   - After building, you can preview the production build:
     ```bash
     npm run preview
     ```

---

Now both the backend (Flask) and frontend (React) servers should be running concurrently for the full application experience!

---


## Features

### 1. **AI-driven Mental Health Therapy**
- Uses Gemini-1.5 to provide empathetic, conversational therapy for mental health support.
- Provides advice for users experiencing mental health challenges with resources like suicide prevention hotlines.
- Maintains a professional and caring tone.
  
#### Endpoint:
- `/mental_chat` (POST)
  
#### Parameters:
- `message` (User's message to the therapist)
- `conversation_history` (Previous conversation)

---

### 2. **Medicine Inventory Management**
- Manage medicine inventory by adding, updating, or deleting medicines.
- Fetch detailed medicine information including purpose, side effects, and dosage.
- Tracks expired medicines for better management.

#### Endpoints:
- `/medicines` (POST): Add a medicine
- `/medicines/<medicine_id>` (PUT): Update a medicine
- `/medicines/<medicine_id>` (DELETE): Delete a medicine
- `/medicines` (GET): List all medicines for a user
- `/expired-medicines` (GET): List expired medicines for a user
- `/refresh-description` (POST): Refresh medicine description

---

### 3. **Prescription Interpretation**
- Analyzes prescription images using OCR and generates clinical summaries of medicines, dosage instructions, and warnings.
- Identifies banned drugs and unsafe combinations in prescriptions.
- Can compare prescribed medicines with a user’s existing inventory and suggest alternatives.

#### Endpoint:
- `/interpret` (POST)
  
#### Parameters:
- Image of prescription, User ID, email, etc.

---

### 4. **Medicine Information Retrieval**
- Scrapes online drug databases like Drugs.com and RxNav API to retrieve medicine information.
- Summarizes medicine data using the Gemini model for easy understanding of purpose, dosage, and side effects.
- Can suggest Ayurvedic alternatives for prescribed medicines.

#### Endpoint:
- `/search-medicines` (GET): Search and retrieve detailed information about a medicine
- `/suggest_ayurvedic` (POST): Suggest Ayurvedic alternatives based on prescription

---

### 5. **Group Management**
- Users can create or join groups to share their medicine inventories with family or friends.
- Invite members by email to join a group.
  
#### Endpoints:
- `/create-group` (POST): Create a group
- `/join-group` (POST): Join an existing group
- `/group-inventory` (GET): Fetch the group’s shared inventory
- `/group-members` (GET): Fetch group members
- `/invite-member` (POST): Invite members to join a group
- `/pending-invitations` (GET): View pending invitations

---

## API References

| Parameter           | Type     | Description                                              |
|---------------------|----------|----------------------------------------------------------|
| `userId`            | String   | The unique identifier of the user                        |
| `userEmail`         | String   | Email address of the user                                |
| `message`           | String   | The user's input message                                 |
| `prescription`      | String   | The text or image of the prescription                    |
| `medicine_name`     | String   | Name of the medicine to retrieve information for         |
| `groupId`           | Integer  | The unique identifier of a group                         |
| `user_id`           | String   | The ID of the user adding or updating the medicine       |
| `quantity`          | Integer  | Quantity of medicine being managed                       |
| `expiryDate`        | Date     | Expiry date of the medicine in the inventory             |
| `conversation_history` | String | A string containing previous user-therapist interaction  |
  
---

## Environment Variables

| Variable         | Description                                                  |
|------------------|--------------------------------------------------------------|
| `API_KEY`        | The API key for Gemini-1.5                                    |
| `Clerk API_KEY`         | The API Key for Clerk authentication and authorization               |

---



## Database Schema

### `family_groups`

| Field      | Type         | Null | Key | Default           | Extra             |
|------------|--------------|------|-----|-------------------|-------------------|
| id         | int          | NO   | PRI | NULL              | auto_increment    |
| name       | varchar(255) | NO   |     | NULL              |                   |
| created_by | varchar(255) | NO   |     | NULL              |                   |
| created_at | timestamp    | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

### `group_invitations`

| Field         | Type         | Null | Key | Default           | Extra             |
|---------------|--------------|------|-----|-------------------|-------------------|
| id            | int          | NO   | PRI | NULL              | auto_increment    |
| group_id      | int          | NO   | MUL | NULL              |                   |
| inviter_id    | varchar(255) | NO   |     | NULL              |                   |
| invitee_email | varchar(255) | NO   |     | NULL              |                   |
| created_at    | timestamp    | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

### `group_members`

| Field     | Type         | Null | Key | Default           | Extra             |
|-----------|--------------|------|-----|-------------------|-------------------|
| id        | int          | NO   | PRI | NULL              | auto_increment    |
| group_id  | int          | NO   | MUL | NULL              |                   |
| user_id   | varchar(255) | NO   |     | NULL              |                   |
| joined_at | timestamp    | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

### `medicines`

| Field       | Type         | Null | Key | Default           | Extra                                         |
|-------------|--------------|------|-----|-------------------|-----------------------------------------------|
| id          | int          | NO   | PRI | NULL              | auto_increment                                |
| name        | varchar(255) | NO   |     | NULL              |                                               |
| quantity    | int          | NO   |     | NULL              |                                               |
| expiryDate  | date         | NO   | MUL | NULL              |                                               |
| userId      | varchar(255) | NO   | MUL | NULL              |                                               |
| userEmail   | varchar(255) | NO   |     | NULL              |                                               |
| username    | varchar(255) | NO   |     | NULL              |                                               |
| created_at  | timestamp    | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED                             |
| updated_at  | timestamp    | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| description | text         | YES  |     | NULL              |                                               |

### `users`

| Field         | Type         | Null | Key | Default | Extra |
|---------------|--------------|------|-----|---------|-------|
| id            | varchar(255) | NO   | PRI | NULL    |       |
| email         | varchar(255) | NO   | UNI | NULL    |       |
| phone_number  | varchar(15)  | NO   | UNI | NULL    |       |
| password_hash | varchar(255) | NO   |     | NULL    |       |

---


## References

1. **Flask Documentation** - [Flask: Web Development](https://flask.palletsprojects.com/)
2. **React Documentation** - [React: A JavaScript library for building user interfaces](https://reactjs.org/docs/getting-started.html)
3. **Vite Documentation** - [Vite: Next Generation Frontend Tooling](https://vitejs.dev/guide/)
4. **MySQL Documentation** - [MySQL: The world's most popular open-source database](https://dev.mysql.com/doc/)
5. **Google Gemini AI Model** - [Google AI Gemini](https://cloud.google.com/generative-ai)
6. **Clerk Authentication** - [Clerk: Authentication Made Simple](https://clerk.dev/docs)
7. **PyPDF2** - [PyPDF2: Python library for PDF operations](https://pypdf2.readthedocs.io/)
8. **BeautifulSoup** - [BeautifulSoup: Web Scraping with Python](https://www.crummy.com/software/BeautifulSoup/)
9. **Drugs.com API** - [Drugs.com: Medication Information](https://www.drugs.com/)
10. **RxNav API** - [RxNav: National Library of Medicine](https://rxnav.nlm.nih.gov/)

---

## Acknowledgments

- **Google Developers**: For providing access to the Gemini-1.5 model.
- **Flask**: For providing the backend framework for API development.
- **React & Vite**: For powering the frontend with a fast development experience.
- **MySQL**: For database management and data storage.
- **PyPDF2 & BeautifulSoup**: For helping in scraping and parsing prescription details.
- **Clerk**: For authentication and user management integration.
- **ShadCN UI**: For a user interface library used in the frontend.
- **OpenAI & Google Cloud**: For AI-driven features and model infrastructure.

