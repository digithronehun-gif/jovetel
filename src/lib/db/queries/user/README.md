# queries/user

Minden itt exportált függvény ELSŐ paramétere a `userId: string`, és minden lekérdezés arra szűr
(4. vasszabály). Ezt a `tests/unit/query-layer.test.ts` gépileg ellenőrzi. A jogosultságot a hívó
(route handler / server action) is ellenőrzi a `requireUser()`-rel — a kettő együtt a két réteg.
