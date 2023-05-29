import json
from django.shortcuts import render
from django.http import JsonResponse
from monitors.models import Observable, Screenshot
from django.views.decorators.csrf import csrf_exempt


def index(request):
    return render(request, 'index.html')


def get_id(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')

    data = json.loads(request.body.decode('utf-8'))

    obj = Observable.objects.get_or_create(
        ip=ip,
        pc_name=data['pc_name'],
    )[0]
    obj.save()

    return JsonResponse({
        'id': obj.id,
        'command': 'connect',
        'pc_name': obj.pc_name,
        'connect_time': obj.connect_time.strftime("%m/%d/%Y, %H:%M:%S"),
        'ip': obj.ip,
    })


def get_observables(request):
    result = []
    for obj in Observable.objects.all():
        result.append({
            'id': obj.id,
            'command': 'connect',
            'pc_name': obj.pc_name,
            'connect_time': obj.connect_time.strftime("%m/%d/%Y, %H:%M:%S"),
            'ip': obj.ip,
        })

    return JsonResponse(result, safe=False)


@csrf_exempt
def save_picture(request):
    obj = Screenshot(
        picture=request.FILES['file']
    )
    obj.save()

    return JsonResponse({
        'sc_url': obj.picture.url
    })
