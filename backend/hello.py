import google.generativeai as genai
from PIL import Image

class PrescriptionInterpreter:
    def init(self, api_key):
        genai.configure(api_key=api_key)

        # Set up the model
        generation_config = {
            "temperature": 0.4,
            "top_p": 1,
            "top_k": 32,
            "max_output_tokens": 4096,
        }

        safety_settings = [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
        ]

        self.model = genai.GenerativeModel(model_name="gemini-1.5-flash",
                                           generation_config=generation_config,
                                           safety_settings=safety_settings)

    def extract_text_from_image(self, image_path):
        # Open the image
        with Image.open(image_path) as img:
            # Convert to RGB if it's not already
            if img.mode != 'RGB':
                img = img.convert('RGB')

            # Generate content from the image
            response = self.model.generate_content(img)

        # Rest of your method remains the same
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

        if not candidate.content:
            print("No content returned in the candidate.")
            return None

        if not candidate.content.parts:
            print("No parts in the candidate content.")
            return None

        for part in candidate.content.parts:
            if part.text:
                return part.text

        print("No text found in any part of the content.")
        return None

    def interpret_prescription(self, image_path):
        text = self.extract_text_from_image(image_path)
        if not text:
            return "Unable to extract text from the image."

        prompt = f"""
        Analyze the following prescription text and extract key information:
        {text}

        Please provide the following details:
        1. Patient Name
        2. Date of Prescription
        3. Medication Name(s)
        4. Dosage and Instructions
        5. Doctor's Name

        If any information is not available or unclear, please indicate so.
        """

        response = self.model.generate_content(prompt)
        return response.text

def main():
    api_key = "AIzaSyAqGxD7ol-QajCyAvqkMJxtkDHLmkWYCkQ"  # Replace with your actual API key
    interpreter = PrescriptionInterpreter(api_key)

    image_path = "9.jpg"  # Replace with your actual image path
    result = interpreter.interpret_prescription(image_path)
    print(result)

if __name__ == "main":
    main()