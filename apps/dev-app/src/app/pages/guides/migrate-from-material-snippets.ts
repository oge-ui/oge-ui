/** Code samples rendered on the Angular Material migration guide. */

export const TABLE = `<!-- Material: a table you assemble — columns, sort and paginator wired by hand -->
<table mat-table [dataSource]="dataSource" matSort>
  <ng-container matColumnDef="name">
    <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
    <td mat-cell *matCellDef="let row">{{ row.name }}</td>
  </ng-container>
  <tr mat-header-row *matHeaderRowDef="['name']"></tr>
  <tr mat-row *matRowDef="let row; columns: ['name']"></tr>
</table>
<mat-paginator [pageSize]="20" />

<!-- OGE: the grid owns sorting, paging, filtering and virtual scrolling -->
<oge-grid [data]="rows" keyField="id" [paging]="{ pageSize: 20 }" [filterRow]="true">
  <oge-column field="name" caption="Name" />
</oge-grid>

<!-- a static, styled table without grid behaviour -->
<oge-simple-table [value]="rows" [columns]="[{ field: 'name', caption: 'Name' }]" />`;

export const DIALOG = `// Material: MatDialog.open(Component, { data }) → afterClosed() observable
const ref = this.dialog.open(EditUser, { data: user, width: '480px' });
ref.afterClosed().subscribe((result) => …);

// OGE: OgeModalService.open(Component, { data }) → a ref whose closed promise carries the result
const ref = this.modals.open(EditUser, { data: user, width: 480 });
ref.closed.then(({ result }) => …);
// inside EditUser: inject(OGE_MODAL_DATA), inject(OgeModalRef).close(value)`;

export const SNACK = `// Material: MatSnackBar — stays until dismissed unless you pass a duration
this.snack.open('Saved', 'Undo', { duration: 3000 });

// OGE: OgeToastService — dismisses itself after 4 s by default, actions included
this.toasts.success('Saved', { action: { text: 'Undo', handler: () => this.undo() } });`;

export const FORM_FIELD = `<!-- Material: mat-form-field wraps a native control -->
<mat-form-field>
  <mat-label>City</mat-label>
  <mat-select [(value)]="city">
    @for (c of cities; track c) { <mat-option [value]="c">{{ c }}</mat-option> }
  </mat-select>
</mat-form-field>

<!-- OGE: the editor carries its own label, chrome and validation messages -->
<oge-select-box label="City" [items]="cities" [(value)]="city" />`;
