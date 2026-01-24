import requests

# The URL you provided
API_URL = "https://conversable-epigenetic-khadijah.ngrok-free.dev"

def main():
    print(f"--- 🏥 Connected to Medical AI ({API_URL}) ---")
    print("Type your question below. Press Ctrl+C or type 'exit' to quit.\n")
    
    while True:
        try:
            question = input("❓ Question: ").strip()
            if question.lower() in ['exit', 'quit']:
                break
            if not question:
                continue
                
            print("⏳ Thinking...")
            response = requests.post(f"{API_URL}/query", json={"message": question})
            
            if response.status_code == 200:
                data = response.json()
                print(f"💡 Answer: {data.get('answer', 'No answer')}\n")
            else:
                print(f"❌ Server Error: {response.text}\n")
                
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            print(f"❌ Connection Error: {e}\n")

if __name__ == "__main__":
    main()
