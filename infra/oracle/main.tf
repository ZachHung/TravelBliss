# TravelBliss production (ADR 0006): one Oracle Cloud Always Free VM, public only through Tailscale Funnel.
# Adapted from openGym's contrib/oracle-free. Guide: #183. Everything here is inside the Always Free limits.

terraform {
  required_version = ">= 1.5"
  required_providers {
    oci    = { source = "oracle/oci", version = ">= 6.0" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }
}

provider "oci" {
  config_file_profile = var.oci_profile # ~/.oci/config: user, key, fingerprint, tenancy, region
}

variable "oci_profile" {
  type    = string
  default = "DEFAULT"
}
variable "tenancy_ocid" {
  type        = string
  description = "The tenancy= line of ~/.oci/config"
}
variable "tailscale_auth_key" {
  type        = string
  sensitive   = true
  description = "One-time key from Tailscale admin > Settings > Keys, used on first boot; tag:travelbliss must exist"
}
variable "ssh_public_key_path" {
  type        = string
  default     = "~/.ssh/oracle-travelbliss.pub"
  description = "For the ubuntu user. Day to day you use Tailscale SSH; this is for ssh_source emergencies"
}
variable "ssh_source" {
  type        = string
  default     = ""
  description = "Empty: no port is open to the internet. Set a CIDR (your IP/32) only to debug a VM Tailscale can't reach"
}
variable "availability_domain" {
  type        = number
  default     = 0
  description = "0, 1 or 2: try another when Oracle says out of capacity (most regions have only 0)"
}
variable "shape" {
  type        = string
  default     = "arm"
  description = "arm: VM.Standard.A1.Flex. micro: VM.Standard.E2.1.Micro (x86, 1 GB), when ARM stays out of capacity"
  validation {
    condition     = contains(["arm", "micro"], var.shape)
    error_message = "shape must be \"arm\" or \"micro\"."
  }
}
variable "arm_ocpus" {
  type    = number
  default = 1
}
variable "arm_memory_gbs" {
  type        = number
  default     = 2
  description = "Small on purpose: Oracle reclaims an idle ARM VM whose memory use stays under 20%, so a bigger VM idles sooner"
}
variable "google_client_id" {
  type    = string
  default = ""
}
variable "google_client_secret" {
  type      = string
  default   = ""
  sensitive = true
}
variable "facebook_app_id" {
  type    = string
  default = ""
}
variable "facebook_app_secret" {
  type      = string
  default   = ""
  sensitive = true
}

locals {
  shape = var.shape == "arm" ? "VM.Standard.A1.Flex" : "VM.Standard.E2.1.Micro"
}

data "oci_identity_availability_domains" "ads" {
  compartment_id = var.tenancy_ocid
}

data "oci_core_images" "ubuntu" {
  compartment_id           = var.tenancy_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "24.04"
  shape                    = local.shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
  filter { # the full image, not "Minimal"
    name   = "display_name"
    values = ["^Canonical-Ubuntu-24\\.04-(aarch64-)?[0-9]"]
    regex  = true
  }
}

# The API's secrets (ADR 0006: they exist only on the VM). Alphanumeric: some end up inside a Redis URL.
resource "random_password" "jwt" {
  length  = 48
  special = false
}
resource "random_password" "refresh" {
  length  = 48
  special = false
}
resource "random_password" "encryption_key" {
  length  = 32 # exactly 32 characters: aes-256-cbc
  special = false
}
resource "random_password" "postgres" {
  length  = 32
  special = false
}
resource "random_password" "redis" {
  length  = 32
  special = false
}
resource "random_password" "backup" {
  length  = 40
  special = false
}

resource "oci_core_vcn" "net" {
  compartment_id = var.tenancy_ocid
  cidr_blocks    = ["10.1.0.0/16"]
  display_name   = "travelbliss"
  dns_label      = "travelbliss"
}

resource "oci_core_internet_gateway" "net" {
  compartment_id = var.tenancy_ocid
  vcn_id         = oci_core_vcn.net.id
  display_name   = "travelbliss"
}

resource "oci_core_route_table" "net" {
  compartment_id = var.tenancy_ocid
  vcn_id         = oci_core_vcn.net.id
  display_name   = "travelbliss"
  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.net.id
  }
}

# Nothing comes in: the site (Funnel) and SSH (Tailscale SSH) both arrive over Tailscale's outbound connection.
resource "oci_core_security_list" "net" {
  compartment_id = var.tenancy_ocid
  vcn_id         = oci_core_vcn.net.id
  display_name   = "travelbliss"
  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }
  dynamic "ingress_security_rules" {
    for_each = var.ssh_source == "" ? [] : [var.ssh_source]
    content {
      source   = ingress_security_rules.value
      protocol = "6"
      tcp_options {
        min = 22
        max = 22
      }
    }
  }
}

resource "oci_core_subnet" "net" {
  compartment_id    = var.tenancy_ocid
  vcn_id            = oci_core_vcn.net.id
  cidr_block        = "10.1.1.0/24"
  display_name      = "travelbliss"
  dns_label         = "main"
  route_table_id    = oci_core_route_table.net.id
  security_list_ids = [oci_core_security_list.net.id]
}

locals {
  # Everything but the public URL, which bootstrap.sh adds once Tailscale says which tailnet this is
  secrets_env = <<-EOT
    API_POSTGRES_USER=travelbliss
    API_POSTGRES_PASSWORD=${random_password.postgres.result}
    API_POSTGRES_DB=travelbliss
    API_REDIS_PASSWORD=${random_password.redis.result}
    API_SALT_ROUND=10
    API_ENCRYPTION_KEY=${random_password.encryption_key.result}
    API_SECRET_JWT=${random_password.jwt.result}
    API_JWT_EXPIRED=5minutes
    API_SECRET_REFRESH=${random_password.refresh.result}
    API_REFRESH_EXPIRED=30d
    API_SESSION_MAX_AGE=90d
    API_COOKIE_NAME=travelBliss
    API_GOOGLE_CLIENT_ID=${var.google_client_id}
    API_GOOGLE_CLIENT_SECRET=${var.google_client_secret}
    API_FACEBOOK_APP_ID=${var.facebook_app_id}
    API_FACEBOOK_APP_SECRET=${var.facebook_app_secret}
  EOT

  # shortcut: these secrets sit in the instance metadata, readable from inside the VM; fine for a VM only you run
  cloud_init = "#cloud-config\n${yamlencode({
    write_files = [
      { path = "/root/travelbliss.env", permissions = "0600", content = "TS_AUTHKEY=${var.tailscale_auth_key}\nTS_NAME=travelbliss\n" },
      { path = "/root/travelbliss-secrets.env", permissions = "0600", content = local.secrets_env },
      { path = "/root/.travelbliss-backup-pass", permissions = "0600", content = random_password.backup.result },
      { path = "/opt/travelbliss/compose.yml", permissions = "0644", content = file("${path.module}/compose.yml") },
      { path = "/usr/local/bin/travelbliss-bootstrap", permissions = "0755", content = file("${path.module}/bootstrap.sh") },
    ]
    runcmd = [["/usr/local/bin/travelbliss-bootstrap"]]
  })}"
}

resource "oci_core_instance" "travelbliss" {
  compartment_id      = var.tenancy_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[var.availability_domain].name
  display_name        = "travelbliss"
  shape               = local.shape
  dynamic "shape_config" { # only the ARM shape is sized; the micro one is fixed
    for_each = var.shape == "arm" ? [1] : []
    content {
      ocpus         = var.arm_ocpus
      memory_in_gbs = var.arm_memory_gbs
    }
  }
  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.ubuntu.images[0].id
    boot_volume_size_in_gbs = 50
  }
  create_vnic_details {
    subnet_id = oci_core_subnet.net.id
    # Outbound only (Tailscale, image pulls); with no ingress rule, nothing reaches it
    assign_public_ip = true
    hostname_label   = "travelbliss"
  }
  metadata = {
    ssh_authorized_keys = file(pathexpand(var.ssh_public_key_path))
    user_data           = base64encode(local.cloud_init)
  }
  # A new Ubuntu image or an edited script must never replace the VM (and its data) on its own.
  # To rebuild on purpose: terraform apply -replace=oci_core_instance.travelbliss
  lifecycle {
    ignore_changes = [source_details[0].source_id, metadata]
  }
}

output "public_ip" {
  description = "No port is open on it unless ssh_source is set"
  value       = oci_core_instance.travelbliss.public_ip
}
output "backup_passphrase" {
  description = "Save it in your password manager: without it the backups (#181) can't be opened"
  value       = random_password.backup.result
  sensitive   = true
}
