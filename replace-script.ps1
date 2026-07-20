$replacements = @(
  @{ Old = 'Secure<br>Dev<br>Warrior'; New = 'PhishShield<br>Awareness<br>Academy' },
  @{ Old = 'Secure Dev Warrior'; New = 'PhishShield Academy' },
  @{ Old = 'SecureCode Platform'; New = 'PhishShield Academy' },
  @{ Old = 'SecureCode'; New = 'PhishShield' },
  @{ Old = 'Entrenamiento seguro de codificación e inteligencia artificial con una reducción de riesgos mensurable'; New = 'Formación práctica en protección contra phishing para empleados con resultados medibles' },
  @{ Old = 'Lenguajes de codificación'; New = 'Escenarios de phishing' },
  @{ Old = 'Entrenador de código seguro'; New = 'Entrenador anti-phishing' },
  @{ Old = 'Codificación segura para OWASP'; New = 'Protección contra phishing para empleados' },
  @{ Old = 'Aumente las habilidades y la productividad'; New = 'Aumente la cultura de seguridad y la productividad' },
  @{ Old = 'Desarrolle habilidades de codificación seguras mientras mantiene la velocidad.'; New = 'Desarrolle hábitos seguros frente al phishing sin frenar el trabajo.' },
  @{ Old = 'Plataforma de gobierno de software de IA'; New = 'Plataforma de formación anti-phishing' },
  @{ Old = 'El plano de control del riesgo de software impulsado por la IA en todo el SDLC'; New = 'Un plan de capacitación y simulación para reducir el riesgo humano ante el phishing' }
)

$files = Get-ChildItem "C:\Users\ricar\repos\fescarcuddle\exmpla-page-2\*.html"
foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $modified = $false
    foreach ($r in $replacements) {
        if ($content.Contains($r.Old)) {
            $content = $content.Replace($r.Old, $r.New)
            $modified = $true
        }
    }
    if ($modified) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        Write-Host "Modified: $($file.Name)"
    } else {
        Write-Host "No changes: $($file.Name)"
    }
}
