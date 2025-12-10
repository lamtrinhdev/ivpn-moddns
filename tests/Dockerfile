FROM python:3.11.9

COPY ./certs /certs
COPY ./tests /tests/

WORKDIR /tests

RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Add the mkcert root certificate to the list of trusted certificates
RUN cat /certs/mkcert_development_CA_307611231582065277882115426409270736451.crt >> /usr/local/lib/python3.10/site-packages/certifi/cacert.pem

ENTRYPOINT ["bash"]
