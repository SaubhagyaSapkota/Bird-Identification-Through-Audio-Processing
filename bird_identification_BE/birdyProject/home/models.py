from django.db import models

# Create your models here.
# Need to add a model to connect to the database
class birdlist(models.Model):
    name = models.CharField(max_length = 25)
    scientificName = models.CharField(max_length = 50)
    image = models.ImageField()
    birdUrl = models.URLField()
    description = models.TextField()

    def __str__(self):
        return self.name
    