from django.db import models

class Order(models.Model):
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('FULFILLED', 'Fulfilled'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    SIDE_CHOICES = [
        ('BUY', 'Buy'),
        ('SELL', 'Sell'),
    ]
    
    order_id = models.CharField(max_length=100, unique=True)
    client_order_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    instrument = models.CharField(max_length=20)
    side = models.CharField(max_length=4, choices=SIDE_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    quantity = models.DecimalField(max_digits=20, decimal_places=8)
    filled_quantity = models.DecimalField(max_digits=20, decimal_places=8)
    limit_price = models.DecimalField(max_digits=20, decimal_places=8, null=True)
    average_price = models.DecimalField(max_digits=20, decimal_places=8, null=True)
    is_local = models.BooleanField(default=True)  # True if placed through this app
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.order_id} - {self.instrument} {self.side}"
