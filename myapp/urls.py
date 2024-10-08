from django.urls import path
from . import views

urlpatterns = [
    path('get-balance/', views.get_balance, name='get_balance'),
    path('withdraw/', views.withdraw_ajax, name='withdraw'),
    path('create-order/', views.create_order_ajax, name='create_order'),
    path('cancel-order/', views.cancel_order_ajax, name='cancel_order'),
    path('', views.dashboard, name='dashboard'),
    path("orders/",views.orders, name='orders'),
]
