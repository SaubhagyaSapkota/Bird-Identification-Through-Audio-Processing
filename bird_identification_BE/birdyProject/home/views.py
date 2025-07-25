import numpy as np
import librosa
import os
from django.conf import settings
from django.shortcuts import render
from django.core.files.storage import default_storage
from django.http import JsonResponse
import tensorflow as tf
from .forms import AudioUploadForm
from .models import birdlist
from pydub import AudioSegment  # For handling audio format conversion
import io
import math
import matplotlib.pyplot as plt
import librosa.display
from django.views.decorators.csrf import csrf_exempt

SAMPLE_RATE = 32000
SPEC_SHAPE = (48, 128)  # height x width
SIGNAL_LENGTH = 10
N_FFT = 1024
HOP_SIZE = int(SIGNAL_LENGTH * SAMPLE_RATE / (SPEC_SHAPE[1] - 1))      
N_MELS = SPEC_SHAPE[0]
FMIN = 500
FMAX = 12500

img_size = (128, 128)

def build_model():
    model = tf.keras.Sequential()
    model.add(tf.keras.layers.Input(shape=(251, 21)))  

    model.add(tf.keras.layers.GRU(64, return_sequences=True))  

    model.add(tf.keras.layers.Dense(3, activation='softmax'))  

    model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

    return model


model = None

def load_model():
    global model
    try:
        model = tf.keras.models.load_model(settings.BASE_DIR / 'my_model_0008.keras')
        print("Model loaded successfully")
    except Exception as e:
        print(f"Model loading failed: {e}")
        model = build_model()


load_model()


# class_names = {0: 'Scarlet-chested Sunbird', 1: 'Egyptian Goose', 2: 'Woodland Kingfisher'} For default model

class_names = {
    0: 'Black-backed Puffback',
    1: 'Black Kite',
    2: 'Willow Warbler',
    3: 'Eurasian Hoopoe',
    4: 'Egyptian Goose',
    5: 'Western Yellow Wagtail',
    6: 'Sombre Greenbul',
    7: 'Tawny-flanked Prinia',
    8: 'Red-backed Scrub-Robin',
    9: 'Cape Robin-Chat',
    10: 'Rattling Cisticola',
    11: 'Wood Sandpiper',
    12: 'Great Egret',
    13: 'Little Egret',
    14: 'European Bee-eater',
    15: 'Common Sandpiper',
    16: 'Common House-Martin',
    17: 'Cattle Egret',
    18: 'Collared Sunbird',
    19: 'Common Buzzard',
    20: 'Barn Swallow',
    21: 'Gray-backed Camaroptera',
    22: 'Common Bulbul',
    23: 'Thrush Nightingale',
    24: 'Red-rumped Swallow'
    }

def convert_audio_to_wav(file_path):
    """
    Converts the audio file to a WAV format if it's not already in WAV format.
    """
    try:
        audio = AudioSegment.from_file(file_path)
        wav_path = file_path.replace(".mp3", ".wav").replace(".flac", ".wav")  # Handles .mp3 and .flac
        audio.export(wav_path, format="wav")
        return wav_path
    except Exception as e:
        print(f"Error converting audio: {e}")
        return file_path  # If conversion fails, return original path

def predict_audio(file_path):
    try:
        # Convert to WAV if needed
        file_path = convert_audio_to_wav(file_path)

        audio, sr = librosa.load(file_path, sr=16000)

        # Extract MFCCs (21 MFCCs to match model input)
        mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=21)

        # Ensure the time steps (frames) match the model's expected input (251 time steps in this case)
        required_time_steps = 251

        if mfccs.shape[1] < required_time_steps:
            # Pad with zeros if shorter
            pad_width = required_time_steps - mfccs.shape[1]
            mfccs = np.pad(mfccs, pad_width=((0, 0), (0, pad_width)), mode='constant')
        else:
            # Truncate if longer
            mfccs = mfccs[:, :required_time_steps]

        # Transpose to match expected input shape (251 time steps, 21 features)
        mfccs = mfccs.T  

        # Reshape to match the model's input shape (1, 251, 21)
        audio_features = np.expand_dims(mfccs, axis=0)  


        # Make the prediction
        prediction = model.predict(audio_features)
        print(prediction)
        # Get the prediction from the last time step (index 250)
        last_time_step_prediction = prediction[-1, :]  # (3,)
    
        # Apply np.argmax to get the class with the highest probability at the last time step
        predicted_class = np.argmax(last_time_step_prediction)
        print(predicted_class)

        # Get the class name from the mapping
        class_name = class_names.get(predicted_class, "Unknown")

        return class_name, last_time_step_prediction.tolist()  # Return class name and the probabilities

    except Exception as e:
        print(f"Error during prediction: {e}")
        return None, None

@csrf_exempt
def upload_and_predict(request):
    try:
        if request.method == 'POST':
          form = AudioUploadForm(request.POST, request.FILES)
          if form.is_valid():
            # Save the uploaded file temporarily
            audio_file = request.FILES['audio_file']
            file_path = os.path.join('temp', audio_file.name)

            # Make sure the directory exists
            os.makedirs(os.path.dirname(file_path), exist_ok=True)

            file_path_full = default_storage.save(file_path, audio_file)
            file_path_full = default_storage.path(file_path_full)

            # Make prediction
            class_name, probabilities = predict_audio(file_path_full)
            # second_Result = predict_bird_using_efficientnet(file_path_full)
            # Clean up the temporary file
            # print(second_Result)
            default_storage.delete(file_path_full)

            if class_name:
                # Fetch additional bird information from the database
                bird_info = birdlist.objects.filter(name__iexact=class_name).first()

                if bird_info:
                    bird_details = {
                        'ScientificName': bird_info.scientificName,
                        'MoreInfo': bird_info.birdUrl,
                    }
                else:
                    bird_details = {}

                # Return the JSON response with the bird class, probabilities, and details
                return JsonResponse({
                    'class_name': class_name,
                    'probabilities': probabilities,
                    'bird_details': bird_details
                })
            else:
                return JsonResponse({'error': 'Prediction failed due to audio processing issues.'}, status=500)
    except Exception as e:
        print(f"Error during prediction: {e}")
        return None, None
