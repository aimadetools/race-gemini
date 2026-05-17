import os
import re


def generate_page(
    template_content,
    business_name,
    phone_number,
    city,
    service_type,
    ai_content,
    primary_color,
    agency_logo,
):
    """Generates a single sample page HTML content."""

    content = template_content.replace("{{businessName}}", business_name)
    content = content.replace("{{service}}", service_type)
    content = content.replace("{{town}}", city)
    content = content.replace("{{ai_content}}", ai_content)
    content = content.replace("{{primaryColor}}", primary_color)
    content = content.replace("{{agencyLogo}}", agency_logo)
    content = content.replace("[PHONE_NUMBER]", phone_number)

    return content


def slugify(text):
    """Converts text to a URL-friendly slug."""
    text = re.sub(r"\s+", "-", text).lower()
    text = re.sub(r"[^a-z0-9-]", "", text)
    return text


def main():
    """Generates 5 sample pages for a fictional business."""
    output_dir = "demo"
    os.makedirs(output_dir, exist_ok=True)

    business_name = "Evergreen Plumbing"
    phone_number = "(206) 555-1234"
    service_type = "Plumbing Services"
    primary_color = "#2E8B57"  # SeaGreen
    agency_logo = f"<span>{business_name}</span>"

    cities = ["Seattle", "Bellevue", "Redmond", "Kirkland", "Tacoma"]

    template_path = "page-template.html"
    with open(template_path, "r", encoding="utf-8") as f:
        template_content = f.read()

    for city in cities:
        business_slug = slugify(business_name)
        city_slug = slugify(city)
        service_slug = slugify(service_type)

        file_name = os.path.join(
            output_dir, f"{business_slug}-{city_slug}-{service_slug}.html"
        )

        ai_content = (
            f"<p>Welcome to {business_name}, your most trusted provider of {service_type} in {city}. "
            f"We are a locally owned and operated business dedicated to providing our community with top-quality, reliable, and affordable plumbing solutions. "
            f"From leaky faucets to emergency repairs, our team of certified professionals is equipped to handle any job, big or small. "
            f"We pride ourselves on our commitment to customer satisfaction and transparent pricing. "
            f"When you need a plumber in {city}, call the experts at {business_name}. We're here to help 24/7.</p>"
        )

        html_content = generate_page(
            template_content,
            business_name,
            phone_number,
            city,
            service_type,
            ai_content,
            primary_color,
            agency_logo,
        )

        with open(file_name, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"Created demo page: {file_name}")


if __name__ == "__main__":
    main()
