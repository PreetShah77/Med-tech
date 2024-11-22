from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from PIL import Image
import mysql.connector
from mysql.connector import Error
from datetime import datetime
import re
import PyPDF2
import requests
from bs4 import BeautifulSoup
import json
from concurrent.futures import ThreadPoolExecutor
import re
from urllib.parse import quote
import time
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
import bcrypt

app = Flask(__name__)
CORS(app,resources={r"/*": {"origins": "*"}})

import os

db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'root'),
    'database': os.getenv('DB_NAME', 'medicine')
}

# Function to create MySQL connection
def create_connection():
    try:
        connection = mysql.connector.connect(**db_config)
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None
    
@app.route('/register', methods=['POST'])
def register_user():
    data = request.json
    user_id = data.get('id')
    email = data.get('email')
    phone_number = data.get('phoneNumber')
    password = data.get('password')

    if not all([user_id, email, phone_number, password]):
        return jsonify({'error': 'All fields are required'}), 400

    connection = create_connection()
    if connection is None:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cursor = connection.cursor()

        # Check if user already exists
        cursor.execute("SELECT * FROM users WHERE id = %s OR email = %s OR phone_number = %s", 
                       (user_id, email, phone_number))
        if cursor.fetchone():
            return jsonify({'error': 'User already exists'}), 409

        # Hash the password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

        # Insert new user
        query = "INSERT INTO users (id, email, phone_number, password_hash) VALUES (%s, %s, %s, %s)"
        cursor.execute(query, (user_id, email, phone_number, hashed_password))
        connection.commit()

        return jsonify({'message': 'User registered successfully'}), 201
    except Error as e:
        return jsonify({'error': f'Failed to register user: {str(e)}'}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()
def load_banned_drugs():
    banned_drugs = set()
    banned_combinations = []
    pdf_path = 'banned_drugs.pdf'
    
    with open(pdf_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        for page in pdf_reader.pages:
            text = page.extract_text()
            # Extract individual drugs
            drugs = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
            banned_drugs.update(drugs)
            # Extract drug combinations
            combinations = re.findall(r'Fixed dose combinations of (.+?)\.', text)
            banned_combinations.extend(combinations)
    
    return banned_drugs, banned_combinations

banned_drugs, banned_combinations = load_banned_drugs()

    
class HealthAdvisor:
    def __init__(self, api_key):
        genai.configure(api_key=api_key)
        
        generation_config = {
            "temperature": 0.7,
            "top_p": 1,
            "top_k": 32,
            "max_output_tokens": 4096,
        }
        
        safety_settings = [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_ONLY_HIGH"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_ONLY_HIGH"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_ONLY_HIGH"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_ONLY_HIGH"
            },
        ]
        
        self.model = genai.GenerativeModel(model_name="gemini-1.5-pro",
                                           generation_config=generation_config,
                                           safety_settings=safety_settings)

    def get_health_advice(self, user_input):
        prompt = f"""
        You are an AI health advisor. Follow this conversation flow:
        1. If this is the first message, ask about specific symptoms
        2. Based on symptoms, ask relevant follow-up questions about:
        - Duration
        - Severity
        - Associated symptoms
        - Triggers or relieving factors
        3. After gathering sufficient information, provide:
        - Potential conditions
        - Recommendations
        - Whether immediate medical attention is needed
        
        Current user input: {user_input}
        
        Respond in a conversational yet professional tone. Include follow-up questions when needed.
        Format the response as a medical conversation, maintaining context of previous symptoms mentioned.
        
        For each piece of advice, include a citation with a link to a reputable medical source.
        """

        try:
            response = self.model.generate_content(prompt)
            return self.process_response(response.text)
        except Exception as e:
            print(f"Error generating health advice: {e}")
            return "I'm sorry, I couldn't generate health advice at the moment. Please try again later."

    def process_response(self, text):
        # Split the text into sentences
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        # Process each sentence to format citations
        processed_sentences = []
        for sentence in sentences:
            match = re.search(r'\[Source: (.*?) \((https?://\S+)\)\]', sentence)
            if match:
                title, link = match.groups()
                formatted_citation = f'[<a href="{link}" target="_blank">{title}</a>]'
                sentence = re.sub(r'\[Source: .*?\]', formatted_citation, sentence)
            processed_sentences.append(sentence)
        
        # Join the processed sentences back into a single text
        return ' '.join(processed_sentences)
    
class MentalHealth:
    def __init__(self, api_key):
        genai.configure(api_key=api_key)
        
        generation_config = {
            "temperature": 0.7,
            "top_p": 1,
            "top_k": 32,
            "max_output_tokens": 4096,
        }
        
        safety_settings = [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_ONLY_HIGH"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_ONLY_HIGH"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_ONLY_HIGH"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_ONLY_HIGH"
            },
        ]
        
        self.model = genai.GenerativeModel(model_name="gemini-1.5-pro",
                                           generation_config=generation_config,
                                           safety_settings=safety_settings)

    def get_mentalhealth_advice(self, user_input, conversation_history):
        prompt = f"""
        You are an AI-based mental health therapist. Your role is to provide supportive, empathetic responses to users seeking help with mental health issues. Always maintain a professional and caring tone. If a user expresses thoughts of self-harm or suicide, advise them to seek immediate professional help and provide resources like suicide prevention hotlines. Remember that you're not a replacement for a human therapist, but a supportive tool to help users explore their thoughts and feelings.

        Conversation history:
        {conversation_history}

        User: {user_input}
        """

        try:
            response = self.model.generate_content(prompt)
            return self.process_response(response.text)
        except Exception as e:
            print(f"Error generating health advice: {e}")
            return "I'm sorry, I couldn't generate health advice at the moment. Please try again later."

    def process_response(self, text):
        # Split the text into sentences
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        # Process each sentence to format citations
        processed_sentences = []
        for sentence in sentences:
            match = re.search(r'\[Source: (.*?) \((https?://\S+)\)\]', sentence)
            if match:
                title, link = match.groups()
                formatted_citation = f'[<a href="{link}" target="_blank">{title}</a>]'
                sentence = re.sub(r'\[Source: .*?\]', formatted_citation, sentence)
            processed_sentences.append(sentence)
        
        # Join the processed sentences back into a single text
        return ' '.join(processed_sentences)
        
class PrescriptionInterpreter:
    def __init__(self, api_key):
        genai.configure(api_key=api_key)
        
        generation_config = {
            "temperature": 0.4,
            "top_p": 1,
            "top_k": 32,
            "max_output_tokens": 4096,
        }
        
        safety_settings = [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_ONLY_HIGH"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_ONLY_HIGH"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_ONLY_HIGH"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_ONLY_HIGH"
            },
        ]
        
        self.model = genai.GenerativeModel(
            model_name="gemini-1.5-pro",
            generation_config=generation_config,
            safety_settings=safety_settings
        )

    def extract_text_from_image(self, image):
        try:
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Create a prompt for the image analysis
            prompt = "Please extract and read all text from this prescription image, including medication names, dosages, and instructions."
            
            # Generate content with both image and text prompt
            response = self.model.generate_content([
                prompt,
                image
            ])
            
            if response.text:
                return response.text
            return None
        except Exception as e:
            print(f"Error extracting text from image: {e}")
            return None

    def interpret_prescription(self, image):
        try:
            # First extract text from image
            extracted_text = self.extract_text_from_image(image)
            if not extracted_text:
                return {
                    "interpretation": "Unable to extract text from the image.",
                    "warnings": []
                }

            # Create interpretation prompt
            prompt = f"""
            Analyze this prescription text and provide a detailed interpretation:
            {extracted_text}

            Please provide:
            1. Patient Name (if available)
            2. Date of Prescription (if available)
            3. Medications prescribed with:
               - Name of medication
               - Dosage
               - Frequency
               - Duration
            4. Special instructions (if any)
            5. Doctor's name (if available)

            Format the response in a clear, structured way.
            """

            # Generate interpretation
            response = self.model.generate_content(prompt)
            
            if not response.text:
                return {
                    "interpretation": "Unable to interpret the prescription content.",
                    "warnings": []
                }

            return {
                "interpretation": response.text,
                "warnings": []
            }

        except Exception as e:
            print(f"Error in interpret_prescription: {e}")
            return {
                "interpretation": "Unable to interpret the prescription. Please ensure the image contains clear prescription information.",
                "warnings": []
            }

    def compare_medicines(self, interpretation, inventory_text):
        try:
            prompt = f"""
            Compare these prescribed medicines with the patient's inventory:

            Prescription interpretation:
            {interpretation}

            Current inventory:
            {inventory_text}

            Please list:
            1. Which prescribed medicines are available in the inventory
            2. Which prescribed medicines are not available and need to be obtained
            Format the response clearly with "Available:" and "Not Available:" sections.
            """

            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Error comparing medicines: {e}")
            return "Unable to compare medicines with inventory."

    def suggest_ayurvedic_alternatives(self, prescription):
        prompt = f"""
        As an Ayurvedic expert, analyze the following prescription and suggest Ayurvedic alternatives for each medicine. 
        Consider the primary function of each medication and provide suitable Ayurvedic remedies or herbs that serve a similar purpose.

        Prescription:
        {prescription}

        For each medicine in the prescription:
        1. Identify the medicine and its primary function.
        2. Suggest one or more Ayurvedic alternatives that serve a similar purpose.
        3. Briefly explain how the Ayurvedic alternative works and any relevant usage instructions.

        Present the information in a clear, list format for each medicine.
        
        Note: These suggestions are for informational purposes only and should not replace professional medical advice.
        Always consult with a qualified Ayurvedic practitioner before making any changes to a prescribed treatment plan.
        """

        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Error generating Ayurvedic alternatives: {e}")
            return "Unable to suggest Ayurvedic alternatives. Please try again later."

api_key = ""  # Replace with your actual API key
interpreter = PrescriptionInterpreter(api_key)
health_advisor = HealthAdvisor(api_key)
mental_health = MentalHealth(api_key)

from PIL import Image
import io
import base64

class HealthImageAnalyzer:
    def __init__(self, api_key):
        genai.configure(api_key=api_key)
        
        generation_config = {
            "temperature": 0.3,
            "top_p": 1,
            "top_k": 32,
            "max_output_tokens": 4096,
        }
        
        safety_settings = [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_ONLY_HIGH"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_ONLY_HIGH"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_ONLY_HIGH"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_ONLY_HIGH"
            },
        ]
        
        self.model = genai.GenerativeModel(
            model_name="gemini-1.5-pro",
            generation_config=generation_config,
            safety_settings=safety_settings
        )

    def analyze_image(self, image, caption=""):
        if image.mode != 'RGB':
            image = image.convert('RGB')
            
        prompt = f"""
        Analyze this medical image with the following context/description:
        {caption if caption else "No description provided"}
        
        Provide:
        1. A comprehensive analysis considering both the image and the provided context
        2. Potential conditions or issues identified
        3. Recommended immediate actions
        4. Urgency level (low/medium/high)
        5. Whether immediate medical attention is needed
        
        Format the response as JSON with the following structure:
        {{
            "analysis": "detailed analysis of the condition",
            "recommendations": ["list", "of", "recommendations"],
            "urgency": "low/medium/high",
            "seek_medical_attention": true/false
        }}
        """
        
        try:
            response = self.model.generate_content([image, prompt])
            result = response.text
            return self.parse_response(result)
        except Exception as e:
            print(f"Error analyzing image: {e}")
            return {
                "analysis": "Unable to analyze the image. Please ensure the image is clear and try again.",
                "recommendations": ["Please try uploading a clearer image"],
                "urgency": "unknown",
                "seek_medical_attention": False
            }

    def parse_response(self, response):
        try:
            # Clean up the response and parse JSON
            cleaned_response = response.strip()
            if not cleaned_response.startswith('{'):
                cleaned_response = cleaned_response[cleaned_response.find('{'):]
            if not cleaned_response.endswith('}'):
                cleaned_response = cleaned_response[:cleaned_response.rfind('}')+1]
            
            result = json.loads(cleaned_response)
            return result
        except Exception as e:
            print(f"Error parsing response: {e}")
            return {
                "analysis": response,
                "recommendations": ["Please consult with a healthcare professional"],
                "urgency": "unknown",
                "seek_medical_attention": False
            }

@app.route('/analyze-health-image', methods=['POST'])
def analyze_health_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    image_file = request.files['image']
    caption = request.form.get('caption', '')
    
    try:
        image = Image.open(image_file)
        analyzer = HealthImageAnalyzer(api_key)
        result = analyzer.analyze_image(image, caption)
        
        return jsonify(result), 200
    except Exception as e:
        print(f"Error processing image: {e}")
        return jsonify({
            'error': 'Failed to process image',
            'details': str(e)
        }), 500
@app.route('/interpret', methods=['POST'])
def interpret_prescription():
    print("Received request for prescription interpretation")
    if 'image' not in request.files:
        print("No image file in request")
        return jsonify({'error': 'No image file provided'}), 400
    
    image_file = request.files['image']
    user_id = request.form.get('userId')
    user_email = request.form.get('userEmail')
    username = request.form.get('username')
    
    print(f"Received data - User ID: {user_id}, Email: {user_email}, Name: {username}")
    
    if not user_id:
        print("No user ID provided")
        return jsonify({'error': 'User ID is required'}), 400
    
    try:
        image = Image.open(image_file)
        print("Image opened successfully")
    except Exception as e:
        print(f"Error opening image: {str(e)}")
        return jsonify({'error': 'Unable to open image file'}), 400
    
    try:
        interpretation_result = interpreter.interpret_prescription(image)
        print("Prescription interpreted")
        
        # Fetch user's inventory
        connection = create_connection()
        if connection is None:
            print("Database connection failed")
            return jsonify({'error': 'Database connection failed'}), 500

        try:
            cursor = connection.cursor(dictionary=True)
            query = "SELECT name, quantity, expiryDate FROM medicines WHERE userId = %s"
            cursor.execute(query, (user_id,))
            inventory_medicines = cursor.fetchall()
            print(f"Fetched {len(inventory_medicines)} medicines from inventory")
        except Error as e:
            print(f"Database error: {str(e)}")
            return jsonify({'error': f'Failed to fetch inventory: {str(e)}'}), 500
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()

        # Compare prescribed medicines with inventory
        inventory_text = "\n".join([f"{med['name']} (Quantity: {med['quantity']}, Expires: {med['expiryDate']})" for med in inventory_medicines])
        comparison_result = interpreter.compare_medicines(interpretation_result, inventory_text)
        print("Medicines compared with inventory")

        return jsonify({
            'prescription_interpretation': interpretation_result,
            'inventory_comparison': comparison_result
        }), 200
    except Exception as e:
        print(f"Error during interpretation: {str(e)}")
        return jsonify({'error': f'Error during interpretation: {str(e)}'}), 500


class MedicineInfoScraper:
    def __init__(self, api_key):
        self.session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
        # Initialize Gemini model
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name="gemini-1.5-pro")

    def _scrape_drugs_com(self, medicine_name):
        try:
            search_url = f"https://www.drugs.com/{quote(medicine_name.lower())}.html"
            response = self.session.get(search_url, timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            content = soup.find('div', class_='contentBox')
            if content:
                # Extract all text from the content div
                full_text = content.get_text(strip=True, separator=' ')
                return full_text
            
            # If direct URL fails, try the search page
            search_url = f"https://www.drugs.com/search.php?searchterm={quote(medicine_name)}"
            response = self.session.get(search_url, timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            result = soup.find('div', class_='ddc-media-list')
            if result:
                full_text = result.get_text(strip=True, separator=' ')
                return full_text
            
            return None
        except Exception as e:
            print(f"Error scraping drugs.com: {e}")
            return None

    def _query_rxnav_api(self, medicine_name):
        try:
            # First get the RxCUI
            url = f"https://rxnav.nlm.nih.gov/REST/rxcui.json?name={quote(medicine_name)}"
            response = self.session.get(url, timeout=10)
            data = response.json()
            
            if 'idGroup' in data and 'rxnormId' in data['idGroup']:
                rxcui = data['idGroup']['rxnormId'][0]
                
                # Get drug information using RxClass API
                info_url = f"https://rxnav.nlm.nih.gov/REST/rxclass/class/byRxcui.json?rxcui={rxcui}"
                info_response = self.session.get(info_url, timeout=10)
                info_data = info_response.json()
                
                if 'rxclassMinConceptList' in info_data:
                    concepts = info_data['rxclassMinConceptList']
                    if concepts:
                        # Combine class names and descriptions
                        descriptions = []
                        for concept in concepts:
                            if 'className' in concept:
                                descriptions.append(f"{concept['className']}")
                        if descriptions:
                            return f"{medicine_name} belongs to: {', '.join(descriptions)}. "
            return None
        except Exception as e:
            print(f"Error querying RxNav API: {e}")
            return None

    def summarize_with_gemini(self, text):
        if not text:
            return None
        
        prompt = f"""
        Summarize the following information about a medicine. Include key details such as:
        - What the medicine is used for
        - How it works
        - Common side effects
        - Important warnings or precautions
        - Dosage information (if available)

        Keep the summary concise but informative, around 200-300 words.

        Medicine Information:
        {text}
        """

        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Error summarizing with Gemini: {e}")
            return None

    def get_medicine_description(self, medicine_name):
        description_parts = []
        
        drugs_com_desc = self._scrape_drugs_com(medicine_name)
        if drugs_com_desc:
            description_parts.append(drugs_com_desc)
            
        rxnav_desc = self._query_rxnav_api(medicine_name)
        if rxnav_desc:
            description_parts.append(rxnav_desc)
            
        if description_parts:
            combined_desc = ' '.join(description_parts)
            summarized_desc = self.summarize_with_gemini(combined_desc)
            return summarized_desc if summarized_desc else combined_desc
        
        return f"{medicine_name} - Please consult a healthcare professional for detailed information about this medication."
    

@app.route('/api/chat', methods=['POST'])
def chat_with_therapist():
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name="gemini-1.5-pro")
    chat = model.start_chat(history=[])
    user_input = request.json.get('message')
    
    prompt = f"""
    You are an AI-based mental health therapist. Your role is to provide supportive, empathetic responses to users seeking help with mental health issues. Always maintain a professional and caring tone. If a user expresses thoughts of self-harm or suicide, advise them to seek immediate professional help and provide resources like suicide prevention hotlines. Remember that you're not a replacement for a human therapist, but a supportive tool to help users explore their thoughts and feelings.

    User: {user_input}
    Therapist:
    """

    try:
        response = chat.send_message(prompt)
        return jsonify({"response": response.text})
    except Exception as e:
        print(f"Error generating response: {e}")
        return jsonify({"error": "Failed to generate response"}), 500

# Update the global instance of the scraper
medicine_scraper = MedicineInfoScraper(api_key)

# Modify your add_medicine route to use the new scraper
@app.route('/medicines', methods=['POST'])
def add_medicine():
    data = request.form
    required_fields = ['name', 'quantity', 'expiryDate', 'userId', 'userEmail', 'username']
    
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    connection = create_connection()
    if connection is None:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        # Use the new scraper to get medicine description
        description = medicine_scraper.get_medicine_description(data['name'])

        cursor = connection.cursor()
        query = """
        INSERT INTO medicines (name, quantity, expiryDate, userId, userEmail, username, description)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        values = (data['name'], data['quantity'], data['expiryDate'],
                 data['userId'], data['userEmail'], data['username'], description)
        cursor.execute(query, values)
        connection.commit()
        return jsonify({
            'message': 'Medicine added successfully',
            'id': cursor.lastrowid,
            'description': description
        }), 201
    except Error as e:
        return jsonify({'error': f'Failed to add medicine: {str(e)}'}), 500
    finally:
        print(description)
        if connection.is_connected():
            cursor.close()
            connection.close()

# Add a route to manually refresh a medicine's description
@app.route('/medicines/<int:medicine_id>/refresh-description', methods=['POST'])
def refresh_medicine_description(medicine_id):
    connection = create_connection()
    if connection is None:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cursor = connection.cursor(dictionary=True)
        
        # Get the medicine name
        cursor.execute("SELECT name FROM medicines WHERE id = %s", (medicine_id,))
        medicine = cursor.fetchone()
        
        if not medicine:
            return jsonify({'error': 'Medicine not found'}), 404
        
        # Get new description
        new_description = medicine_scraper.get_medicine_description(medicine['name'])
        
        # Update the description
        cursor.execute(
            "UPDATE medicines SET description = %s WHERE id = %s",
            (new_description, medicine_id)
        )
        connection.commit()
        
        return jsonify({
            'message': 'Description updated successfully',
            'description': new_description
        }), 200
    except Error as e:
        return jsonify({'error': f'Failed to refresh description: {str(e)}'}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()
@app.route('/medicines', methods=['GET'])
def get_medicines():
    user_id = request.args.get('userId')
    print("Userid:")
    print(user_id)
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400

    connection = create_connection()
    if connection is None:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cursor = connection.cursor(dictionary=True)
        query = "SELECT * FROM medicines WHERE userId = %s"
        cursor.execute(query, (user_id,))
        medicines = cursor.fetchall()
        return jsonify(medicines), 200
    except Error as e:
        return jsonify({'error': f'Failed to fetch medicines: {str(e)}'}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/medicines/<int:medicine_id>', methods=['PUT'])
def update_medicine(medicine_id):
    data = request.json
    connection = create_connection()
    if connection is None:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cursor = connection.cursor()
        query = """
        UPDATE medicines 
        SET quantity = %s, expiryDate = %s
        WHERE id = %s
        """
        cursor.execute(query, (data['quantity'], data['expiryDate'], medicine_id))
        connection.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': 'Medicine not found'}), 404
        return jsonify({'message': 'Medicine updated successfully'}), 200
    except Error as e:
        return jsonify({'error': f'Failed to update medicine: {str(e)}'}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/medicines/<int:medicine_id>', methods=['DELETE'])
def delete_medicine(medicine_id):
    connection = create_connection()
    if connection is None:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cursor = connection.cursor()
        query = "DELETE FROM medicines WHERE id = %s"
        cursor.execute(query, (medicine_id,))
        connection.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': 'Medicine not found'}), 404
        return jsonify({'message': 'Medicine deleted successfully'}), 200
    except Error as e:
        return jsonify({'error': f'Failed to delete medicine: {str(e)}'}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/search-medicines', methods=['GET'])
def search_medicines():
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-pro')
    user_id = request.args.get('userId')
    query = request.args.get('query')

    if not user_id or not query:
        return jsonify({'error': 'User ID and search query are required'}), 400

    connection = None
    cursor = None

    try:
        # Use Gemini to interpret the search query
        prompt = f"""
        Interpret the following search query for a medicine inventory:
        "{query}"
        
        Provide a JSON response with the following structure:
        {{
            "name_keywords": ["list", "of", "keywords"],
            "description_keywords": ["list", "of", "keywords"]
        }}
        
        The name_keywords should be specific medicine names or types,
        while description_keywords should be symptoms or conditions.
        """
        
        response = model.generate_content(prompt)
        print(f"Raw Gemini response: {response.text}")  # Debug print
        
        try:
            # Remove Markdown code block syntax if present
            json_str = response.text.strip('`').strip()
            if json_str.startswith('json'):
                json_str = json_str[4:].strip()
            interpretation = json.loads(json_str)
        except json.JSONDecodeError as json_error:
            print(f"JSON decode error: {json_error}")
            # Fallback to a simple keyword extraction
            keywords = query.lower().split()
            interpretation = {
                "name_keywords": keywords,
                "description_keywords": keywords
            }

        # Construct SQL query based on the interpretation
        sql_query = """
        SELECT * FROM medicines 
        WHERE userId = %s AND (
            LOWER(name) REGEXP %s
            OR LOWER(description) REGEXP %s
        )
        """
        
        name_pattern = '|'.join(interpretation['name_keywords'])
        desc_pattern = '|'.join(interpretation['description_keywords'])
        
        connection = create_connection()
        if connection is None:
            return jsonify({'error': 'Database connection failed'}), 500

        cursor = connection.cursor(dictionary=True)
        cursor.execute(sql_query, (user_id, name_pattern, desc_pattern))
        results = cursor.fetchall()
        
        return jsonify(results), 200

    except Exception as e:
        print(f"Error in search_medicines: {str(e)}")
        return jsonify({'error': f'Failed to process search query: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
@app.route('/suggest_ayurvedic', methods=['POST'])
def suggest_ayurvedic():
    data = request.json
    prescription = data.get('prescription', '')

    if not prescription:
        return jsonify({'error': 'Prescription is required'}), 400

    try:
        ayurvedic_suggestions = interpreter.suggest_ayurvedic_alternatives(prescription)
        return jsonify({"ayurvedic_alternatives": ayurvedic_suggestions}), 200
    except Exception as e:
        print(f"Error suggesting ayurvedic alternatives: {e}")
        return jsonify({"error": "Failed to suggest ayurvedic alternatives"}), 500
    

@app.route('/expired-medicines', methods=['GET'])
def get_expired_medicines():
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400

    connection = create_connection()
    if connection is None:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cursor = connection.cursor(dictionary=True)
        today = datetime.now().date()
        query = "SELECT * FROM medicines WHERE userId = %s AND expiryDate <= %s"
        cursor.execute(query, (user_id, today))
        expired_medicines = cursor.fetchall()
        return jsonify(expired_medicines), 200
    except Error as e:
        print(f"Database error in get_expired_medicines: {str(e)}")
        return jsonify({'error': f'Failed to fetch expired medicines: {str(e)}'}), 500
    except Exception as e:
        print(f"Unexpected error in get_expired_medicines: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200
        

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_input = data.get('message', '')

    if not user_input:
        return jsonify({'error': 'User input is required'}), 400

    try:
        response = health_advisor.get_health_advice(user_input)
        return jsonify({"response": response}), 200
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return jsonify({"error": "Failed to generate response"}), 500
    

@app.route('/mental_chat', methods=['POST'])
def mentalchat():
    data = request.json
    user_input = data.get('message', '')
    conversation_history = data.get('conversation_history', '')

    if not user_input:
        return jsonify({'error': 'User input is required'}), 400

    try:
        response = mental_health.get_mentalhealth_advice(user_input, conversation_history)
        return jsonify({"response": response}), 200
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return jsonify({"error": "Failed to generate response"}), 500

    

# New endpoints for family group functionality
@app.route('/create-group', methods=['POST'])
def create_group():
    data = request.json
    group_name = data.get('groupName')
    user_id = data.get('userId')

    if not group_name or not user_id:
        return jsonify({'error': 'Group name and user ID are required'}), 400

    connection = create_connection()
    if connection is None:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cursor = connection.cursor()
        
        # Create group
        group_query = "INSERT INTO family_groups (name, created_by) VALUES (%s, %s)"
        cursor.execute(group_query, (group_name, user_id))
        group_id = cursor.lastrowid

        # Add creator to group
        member_query = "INSERT INTO group_members (group_id, user_id) VALUES (%s, %s)"
        cursor.execute(member_query, (group_id, user_id))

        connection.commit()
        return jsonify({'message': 'Group created successfully', 'groupId': group_id}), 201
    except Error as e:
        return jsonify({'error': f'Failed to create group: {str(e)}'}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/join-group', methods=['POST'])
def join_group():
    data = request.json
    group_id = data.get('groupId')
    user_id = data.get('userId')

    if not group_id or not user_id:
        return jsonify({'error': 'Group ID and user ID are required'}), 400

    connection = create_connection()
    if connection is None:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cursor = connection.cursor()
        query = "INSERT INTO group_members (group_id, user_id) VALUES (%s, %s)"
        cursor.execute(query, (group_id, user_id))
        connection.commit()
        return jsonify({'message': 'Joined group successfully'}), 200
    except Error as e:
        return jsonify({'error': f'Failed to join group: {str(e)}'}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/group-inventory', methods=['GET'])
def get_group_inventory():
    group_id = request.args.get('groupId')
    if not group_id:
        return jsonify({'error': 'Group ID is required'}), 400

    connection = create_connection()
    if connection is None:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cursor = connection.cursor(dictionary=True)
        query = """
        SELECT m.* FROM medicines m
        JOIN group_members gm ON m.userId = gm.user_id
        WHERE gm.group_id = %s
        """
        cursor.execute(query, (group_id,))
        medicines = cursor.fetchall()
        return jsonify(medicines), 200
    except Error as e:
        return jsonify({'error': f'Failed to fetch group inventory: {str(e)}'}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/group-members', methods=['GET'])
def get_group_members():
       group_id = request.args.get('groupId')
       if not group_id:
           return jsonify({'error': 'Group ID is required'}), 400

       connection = create_connection()
       if connection is None:
           return jsonify({'error': 'Database connection failed'}), 500

       try:
           cursor = connection.cursor(dictionary=True)
           query = """
           SELECT u.id, u.email
           FROM users u
           JOIN group_members gm ON u.id = gm.user_id
           WHERE gm.group_id = %s
           """
           cursor.execute(query, (group_id,))
           members = cursor.fetchall()
           print(members)
           return jsonify(members), 200
       
       except Error as e:
           print(f"Database error in get_group_members: {str(e)}")
           return jsonify({'error': f'Failed to fetch group members: {str(e)}'}), 500
       except Exception as e:
           print(f"Unexpected error in get_group_members: {str(e)}")
           return jsonify({'error': 'An unexpected error occurred'}), 500
       finally:
           if connection and connection.is_connected():
               cursor.close()
               connection.close()

@app.route('/leave-group', methods=['POST'])
def leave_group():
    data = request.json
    group_id = data.get('groupId')
    user_id = data.get('userId')

    if not group_id or not user_id:
        return jsonify({'error': 'Group ID and user ID are required'}), 400

    connection = create_connection()
    if connection is None:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cursor = connection.cursor()
        query = "DELETE FROM group_members WHERE group_id = %s AND user_id = %s"
        cursor.execute(query, (group_id, user_id))
        connection.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': 'User not found in the group'}), 404
        return jsonify({'message': 'Left group successfully'}), 200
    except Error as e:
        return jsonify({'error': f'Failed to leave group: {str(e)}'}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/invite-member', methods=['POST'])
def invite_member():
    data = request.json
    group_id = data.get('groupId')
    inviter_id = data.get('inviterId')
    invitee_email = data.get('inviteeEmail')

    if not all([group_id, inviter_id, invitee_email]):
        return jsonify({'error': 'Group ID, inviter ID, and invitee email are required'}), 400

    connection = create_connection()
    if connection is None:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cursor = connection.cursor(dictionary=True)
        
        # Check if the inviter is in the group
        cursor.execute("SELECT * FROM group_members WHERE group_id = %s AND user_id = %s", (group_id, inviter_id))
        if not cursor.fetchone():
            return jsonify({'error': 'Inviter is not a member of the group'}), 403

        # Create invitation
        cursor.execute("INSERT INTO group_invitations (group_id, inviter_id, invitee_email) VALUES (%s, %s, %s)",
                       (group_id, inviter_id, invitee_email))
        invitation_id = cursor.lastrowid
        connection.commit()

        # In a real-world scenario, you would send an email to the invitee here

        return jsonify({'message': 'Invitation sent successfully', 'invitationId': invitation_id}), 201
    except Error as e:
        return jsonify({'error': f'Failed to send invitation: {str(e)}'}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/pending-invitations', methods=['GET'])
def get_pending_invitations():
    user_email = request.args.get('userEmail')
    if not user_email:
        return jsonify({'error': 'User email is required'}), 400

    connection = create_connection()
    if connection is None:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cursor = connection.cursor(dictionary=True)
        query = """
        SELECT 
            gi.id,
            gi.group_id,
            fg.name as group_name,
            gi.inviter_id,
            u.email as inviter_email
        FROM group_invitations gi
        JOIN family_groups fg ON gi.group_id = fg.id
        JOIN users u ON gi.inviter_id = u.id
        WHERE gi.invitee_email = %s
        """
        cursor.execute(query, (user_email,))
        invitations = cursor.fetchall()
        return jsonify(invitations), 200
    except Error as e:
        print(f"Database error in get_pending_invitations: {str(e)}")
        return jsonify({'error': f'Failed to fetch pending invitations: {str(e)}'}), 500
    except Exception as e:
        print(f"Unexpected error in get_pending_invitations: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()

# Update the respond-invitation endpoint to include the user's email
@app.route('/respond-invitation', methods=['POST'])
def respond_invitation():
    data = request.json
    invitation_id = data.get('invitationId')
    user_email = data.get('userEmail')
    accept = data.get('accept')

    if not all([invitation_id, user_email, accept is not None]):
        return jsonify({'error': 'Invitation ID, user email, and response are required'}), 400

    connection = create_connection()
    if connection is None:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cursor = connection.cursor(dictionary=True)
        
        # Fetch invitation details
        cursor.execute("SELECT * FROM group_invitations WHERE id = %s", (invitation_id,))
        invitation = cursor.fetchone()
        if not invitation:
            return jsonify({'error': 'Invitation not found'}), 404

        if accept:
            # Get user ID from email
            cursor.execute("SELECT id FROM users WHERE email = %s", (user_email,))
            user = cursor.fetchone()
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            # Add user to group
            cursor.execute("INSERT INTO group_members (group_id, user_id) VALUES (%s, %s)",
                           (invitation['group_id'], user['id']))
            
        # Delete invitation
        cursor.execute("DELETE FROM group_invitations WHERE id = %s", (invitation_id,))
        
        connection.commit()
        return jsonify({'message': 'Invitation response processed successfully'}), 200
    except Error as e:
        return jsonify({'error': f'Failed to process invitation response: {str(e)}'}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()
@app.route('/user-groups', methods=['GET'])
def get_user_groups():
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400

    connection = create_connection()
    if connection is None:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cursor = connection.cursor(dictionary=True)
        query = """
        SELECT fg.id, fg.name, fg.created_by, 
               (SELECT COUNT(*) FROM group_members WHERE group_id = fg.id) as member_count
        FROM family_groups fg
        JOIN group_members gm ON fg.id = gm.group_id
        WHERE gm.user_id = %s
        """
        cursor.execute(query, (user_id,))
        groups = cursor.fetchall()
        return jsonify(groups), 200
    except Error as e:
        return jsonify({'error': f'Failed to fetch user groups: {str(e)}'}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/process-intent', methods=['POST'])
def process_intent():
    data = request.json
    user_input = data.get('input', '')

    prompt = """
    Analyze the following user input and determine which feature they want to access.
    Features available:
    - inventory (for medicine inventory management)
    - prescription (for prescription analysis)
    - family-group (for family group management)
    - therapist (for AI therapy sessions)
    - diagnosis (for symptom diagnosis)

    Return only one of these exact feature names based on the user's intent.

    User input: {input}
    """.format(input=user_input)

    try:
        model = genai.GenerativeModel('gemini-1.5-pro')
        response = model.generate_content(prompt)
        intent = response.text.strip().lower()
        
        # Validate intent is one of the allowed values
        valid_intents = ['inventory', 'prescription', 'family-group', 'therapist', 'diagnosis']
        if intent not in valid_intents:
            intent = 'unknown'
            
        return jsonify({'intent': intent}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5050)
