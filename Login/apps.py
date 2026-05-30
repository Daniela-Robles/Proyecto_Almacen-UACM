from django.apps import AppConfig


class LoginConfig(AppConfig):
    name = 'Login'

    def ready(self):
        pass


"""class LoginConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'Login'"""
