import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";

/**
 * جذرُ التطبيق — منفذُ توجيهٍ ولا شيء غيره.
 *
 * ⚠️ **ولا شريطَ ولا تذييلَ هنا.** شاشةُ الدخول لا شريطَ لها (لا وجهةَ
 * يذهب إليها من لم يدخل)، وشريطُ الجدول يخصّه ويحمل بريدَ الداخل وزرَّ
 * خروجه. فوضعُه في الجذر يعني شريطًا فارغًا فوق شاشة الدخول.
 */
@Component({
  selector: "app-root",
  imports: [RouterOutlet],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
})
export class App {}
