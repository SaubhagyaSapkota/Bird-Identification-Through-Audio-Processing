from django.urls import path
# from . import views
from home import views
# from .views import upload_and_predict

urlpatterns = [
    path('upload/', views.upload_and_predict, name='upload_audio'), 
    # path('effic/',views.upload_and_predict_effic, name= "effic_upload")
]
      # Example route
    # path('', views.upload_and_predict, name='upload_audio'),  # Example route