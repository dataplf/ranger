from apache_ranger.model.ranger_service import RangerService
from apache_ranger.client.ranger_client import RangerClient
from json import JSONDecodeError

import os

ranger_client = RangerClient('http://ranger:6080', ('admin', os.environ['RANGER_ADMIN_PASSWORD']))


def service_not_exists(service):
    try:
        svc = ranger_client.get_service(service.name)
    except JSONDecodeError:
        return 1
    return 0 if svc is not None else 1


trino = RangerService({'name': 'dev_trino', 'type': 'trino',
                       'configs': {'username': 'rangeradmin', 'jdbc.url': 'jdbc:trino://ranger-trino:8080', 'jdbc.driverClassName': 'io.trino.jdbc.TrinoDriver',}})

kms = RangerService({'name': 'dev_kms', 'type': 'kms',
                      'configs': {'username': 'keyadmin', 'password': 'rangerR0cks!',
                                  'provider': 'http://ranger-kms:9292'}})

if service_not_exists(trino):
    ranger_client.create_service(trino)
    print('Trino service created!')
if service_not_exists(kms):
    ranger_client.create_service(kms)
    print('KMS service created!')
