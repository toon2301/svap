"""Výber úložiska pre fotky v správach (`messaging/storage.py`).

V produkcii (S3) musia byť fotky správ v súkromnom úložisku (ACL private, podpísané adresy); v DEV a testoch sa používa
bežné lokálne úložisko. Výber sa rozhoduje podľa `settings.STORAGES["default"]`, preto ho tento test drží pod kontrolou
pri každej zmene nastavení úložísk (napr. pri prechode na Django 5.1+, ktoré staré nastavenia ignoruje).
"""

from django.test import SimpleTestCase, override_settings

from messaging import storage as message_storage

S3_STORAGES = {
    "default": {"BACKEND": "storages.backends.s3boto3.S3Boto3Storage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
LOCAL_STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
S3_SETTINGS = {
    "AWS_ACCESS_KEY_ID": "test",
    "AWS_SECRET_ACCESS_KEY": "test",
    "AWS_STORAGE_BUCKET_NAME": "bucket",
    "AWS_S3_REGION_NAME": "eu-central-1",
}


class MessageImageStorageSelectionTests(SimpleTestCase):
    @override_settings(STORAGES=S3_STORAGES)
    def test_s3_default_storage_is_detected(self):
        self.assertTrue(message_storage._s3_default_storage_active())

    @override_settings(STORAGES=LOCAL_STORAGES)
    def test_local_default_storage_is_not_detected_as_s3(self):
        self.assertFalse(message_storage._s3_default_storage_active())

    @override_settings(STORAGES=S3_STORAGES, **S3_SETTINGS)
    def test_s3_uses_private_storage_with_signed_urls(self):
        storage = message_storage.get_message_image_storage()

        self.assertEqual(type(storage).__name__, "PrivateMessageStorage")
        self.assertEqual(storage.default_acl, "private")
        self.assertTrue(storage.querystring_auth)
        self.assertFalse(storage.file_overwrite)

    @override_settings(STORAGES=LOCAL_STORAGES)
    def test_local_storage_uses_default_storage(self):
        storage = message_storage.get_message_image_storage()

        self.assertIs(storage, message_storage.default_storage)
