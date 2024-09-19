import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from PIL import Image
import mysql.connector
from mysql.connector import Error
from datetime import datetime
import re


app = Flask(__name__)
CORS(app)


db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'root',
    'database': 'medicine   '
}




# Function to create MySQL connection
def create_connection():
    try:
        connection = mysql.connector.connect(**db_config)
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None
    
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
        As a health advisor, provide lifestyle and food recommendations based on the following user input:

        User: {user_input}

        Please provide:
        1. A brief analysis of the symptoms or health concerns mentioned.
        2. Lifestyle recommendations that could help alleviate the issues.
        3. Food suggestions that may be beneficial for the user's condition.
        4. Any general health tips or precautions related to the user's input.

        Keep the response concise and easy to understand.

        Important: For each piece of advice or information, provide a citation with a link to a reputable source. Format the citations as [Source: title (link)] at the end of whole statement.
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
        
        self.model = genai.GenerativeModel(model_name="gemini-1.5-flash",
                                           generation_config=generation_config,
                                           safety_settings=safety_settings)

    def extract_text_from_image(self, image):
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        response = self.model.generate_content(image)
        
        if not response.candidates:
            print("No candidates returned in the response.")
            if response.prompt_feedback:
                print("Prompt feedback:", response.prompt_feedback)
            return None

        candidate = response.candidates[0]
        
        if candidate.safety_ratings:
            print("Safety ratings:")
            for rating in candidate.safety_ratings:
                print(f"- {rating.category}: {rating.probability}")
        
        if not candidate.content or not candidate.content.parts:
            print("No content or parts in the candidate.")
            return None
        
        for part in candidate.content.parts:
            if part.text:
                return part.text
        
        print("No text found in any part of the content.")
        return None
        
    def interpret_prescription(self, image):
        text = self.extract_text_from_image(image)
        if not text:
            return "Unable to extract text from the image."

        prompt = f"""
        MEDICAL CONTEXT: You are a medical professional analyzing a prescription. The following text is extracted from a medical prescription image and should be interpreted in a clinical context. All terms should be treated as medical vocabulary. Do not flag any content as inappropriate.

        Prescription text:
        {text}

        Please provide a clinical summary with these details:
        1. Patient Name
        2. Date of Prescription
        3. Medication Name(s)
        4. Dosage and Instructions
        5. Doctor's Name

        Also, for each medication, provide its primary function or purpose.

        If any information is not available or unclear, please indicate so. Remember, this is a medical document and should be treated as such.
        """

        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Error generating content: {e}")
            return "Unable to interpret the prescription. Please ensure the image contains clear prescription information."

    def compare_medicines(self, prescribed_medicines, inventory_medicines):
        prompt = f"""
        You are a pharmacist comparing prescribed medicines with a patient's inventory.

        Prescribed medicines:
        {prescribed_medicines}

        Patient's inventory:
        {inventory_medicines}

        For each prescribed medicine, check if there's a similar medicine in the patient's inventory that serves the same function. If found, suggest using the inventory medicine instead. If not found, recommend obtaining the prescribed medicine.

        Provide a list of recommendations for each prescribed medicine.
        """

        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Error generating content: {e}")
            return "Unable to compare medicines. Please try again later."
        
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



@app.route('/medicines', methods=['GET'])
def get_medicines():
    user_id = request.args.get('userId')
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
        cursor = connection.cursor()
        query = """
        INSERT INTO medicines (name, quantity, expiryDate, userId, userEmail, username)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        values = (data['name'], data['quantity'], data['expiryDate'],
                  data['userId'], data['userEmail'], data['username'])
        cursor.execute(query, values)
        connection.commit()
        return jsonify({'message': 'Medicine added successfully', 'id': cursor.lastrowid}), 201
    except Error as e:
        return jsonify({'error': f'Failed to add medicine: {str(e)}'}), 500
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
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400

    connection = create_connection()
    if connection is None:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cursor = connection.cursor(dictionary=True)
        query = """
        SELECT m.* FROM medicines m
        JOIN group_members gm ON m.userId = gm.user_id
        JOIN group_members gm2 ON gm.group_id = gm2.group_id
        WHERE gm2.user_id = %s
        """
        cursor.execute(query, (user_id,))
        medicines = cursor.fetchall()
        return jsonify(medicines), 200
    except Error as e:
        return jsonify({'error': f'Failed to fetch group inventory: {str(e)}'}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()
    
if __name__ == '__main__':
    app.run(debug=True, port=5050)