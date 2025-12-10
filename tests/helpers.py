import string
import random

def generate_complex_password(length: int = 16) -> str:
    """
    Generate a random complex password with at least one uppercase letter,
    one lowercase letter, one digit and one special character.
    
    Args:
        length (int): The total length of the password (default: 16)
        
    Returns:
        str: A random complex password
    """
    # Ensure we have at least one of each required character type
    password_chars = [
        random.choice(string.ascii_uppercase),  # At least 1 uppercase
        random.choice(string.ascii_lowercase),  # At least 1 lowercase
        random.choice(string.digits),           # At least 1 digit
        random.choice(string.punctuation)       # At least 1 special char
    ]
    
    # Add more random characters to reach the desired length
    password_chars.extend(random.choice(string.ascii_letters + string.digits + string.punctuation) 
                            for _ in range(length - 4))
    
    # Shuffle to make it unpredictable
    random.shuffle(password_chars)
    return ''.join(password_chars)